import torch
import torch.nn as nn
import timm
import warnings


class ConvLSTMCell(nn.Module):
    def __init__(self, input_dim, hidden_dim, kernel_size, bias=True):
        super(ConvLSTMCell, self).__init__()
        
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.kernel_size = kernel_size
        self.padding = kernel_size[0] // 2, kernel_size[1] // 2
        self.bias = bias
        
        self.conv = nn.Conv2d(
            in_channels=self.input_dim + self.hidden_dim,
            out_channels=4 * self.hidden_dim,
            kernel_size=self.kernel_size,
            padding=self.padding,
            bias=self.bias
        )
    
    def forward(self, input_tensor, cur_state):
        h_cur, c_cur = cur_state
        
        # Concatenate along channel axis
        combined = torch.cat([input_tensor, h_cur], dim=1)
        
        combined_conv = self.conv(combined)
        cc_i, cc_f, cc_o, cc_g = torch.split(combined_conv, self.hidden_dim, dim=1)
        
        i = torch.sigmoid(cc_i)
        f = torch.sigmoid(cc_f)
        o = torch.sigmoid(cc_o)
        g = torch.tanh(cc_g)
        
        c_next = f * c_cur + i * g
        h_next = o * torch.tanh(c_next)
        
        return h_next, c_next
    
    def init_hidden(self, batch_size, image_size):
        height, width = image_size
        return (torch.zeros(batch_size, self.hidden_dim, height, width, device=self.conv.weight.device),
                torch.zeros(batch_size, self.hidden_dim, height, width, device=self.conv.weight.device))

class ConvLSTM(nn.Module):
    def __init__(self, input_dim, hidden_dim, kernel_size, num_layers, bias=True):
        super(ConvLSTM, self).__init__()
        
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.kernel_size = kernel_size
        self.num_layers = num_layers
        self.bias = bias
        
        cell_list = []
        for i in range(0, self.num_layers):
            cur_input_dim = self.input_dim if i == 0 else self.hidden_dim[i-1]
            
            cell_list.append(ConvLSTMCell(
                input_dim=cur_input_dim,
                hidden_dim=self.hidden_dim[i],
                kernel_size=self.kernel_size,
                bias=self.bias
            ))
        
        self.cell_list = nn.ModuleList(cell_list)
    
    def forward(self, input_tensor):
        # input_tensor: [batch, seq_len, channels, height, width]
        b, seq_len, _, h, w = input_tensor.size()
        
        # Initialize hidden states
        hidden_state = []
        for i in range(self.num_layers):
            hidden_state.append(self.cell_list[i].init_hidden(b, (h, w)))
        
        layer_output_list = []
        last_state_list = []
        
        cur_layer_input = input_tensor
        
        for layer_idx in range(self.num_layers):
            h, c = hidden_state[layer_idx]
            output_inner = []
            
            for t in range(seq_len):
                h, c = self.cell_list[layer_idx](cur_layer_input[:, t, :, :, :], (h, c))
                output_inner.append(h)
            
            layer_output = torch.stack(output_inner, dim=1)
            cur_layer_input = layer_output
            
            layer_output_list.append(layer_output)
            last_state_list.append((h, c))
        
        return layer_output_list[-1], last_state_list

class SpeedEstimationModel_convlstm(nn.Module):
    def __init__(self, backbone='efficientnetv2_rw_t', pretrained=True, convlstm_hidden_dim=[64, 32], dropout=0.3):
        super(SpeedEstimationModel_convlstm, self).__init__()
        
        # Feature extractor
        self.backbone = timm.create_model(backbone, pretrained=pretrained, features_only=True)
        
        # Get feature dimensions
        with torch.no_grad():
            dummy_input = torch.randn(1, 3, 224, 224)
            features = self.backbone(dummy_input)
            # Use features from middle layers for better spatial resolution
            self.feature_dim = features[2].shape[1]  # Usually around 48-64 channels
            self.feature_size = features[2].shape[2:]  # Spatial dimensions
        
        # ConvLSTM for temporal modeling
        self.convlstm = ConvLSTM(
            input_dim=self.feature_dim,
            hidden_dim=convlstm_hidden_dim,
            kernel_size=(3, 3),
            num_layers=len(convlstm_hidden_dim),
            bias=True
        )
        
        # Global average pooling and regression head
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        self.dropout = nn.Dropout(dropout)
        self.regressor = nn.Sequential(
            nn.Linear(convlstm_hidden_dim[-1], 128),
            nn.ReLU(),
            nn.Dropout(dropout/2),
            nn.Linear(128, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )
    
    def forward(self, x):
        # x: [batch, seq_len, channels, height, width]
        batch_size, seq_len = x.shape[:2]
        
        # Extract features for each frame
        features_list = []
        for t in range(seq_len):
            frame_features = self.backbone(x[:, t])
            # Use middle layer features (index 2) for better spatial info
            features_list.append(frame_features[2])
        
        # Stack features: [batch, seq_len, channels, height, width]
        features = torch.stack(features_list, dim=1)
        
        # Pass through ConvLSTM
        lstm_output, _ = self.convlstm(features)
        
        # Use final timestep output
        final_features = lstm_output[:, -1]  # [batch, hidden_dim, height, width]
        
        # Global pooling and regression
        pooled = self.global_pool(final_features).squeeze(-1).squeeze(-1)
        pooled = self.dropout(pooled)
        speed = self.regressor(pooled)
        
        return speed

class SpeedEstimationModel_cnn_lstm(nn.Module):
    def __init__(self, backbone='efficientnetv2_rw_t', pretrained=True, lstm_hidden_dim=128, lstm_layers=2, dropout=0.5):
        super(SpeedEstimationModel_cnn_lstm, self).__init__()
        
        # Feature extractor (CNN)
        with warnings.catch_warnings():
            warnings.filterwarnings('ignore', message='.*Unexpected keys.*pretrained weights.*')
            self.backbone = timm.create_model(backbone, pretrained=pretrained, features_only=True)
        
        # Get feature dimensions
        with torch.no_grad():
            dummy_input = torch.randn(1, 3, 224, 224)
            features = self.backbone(dummy_input)
            # Use features from middle layers for better spatial resolution
            self.feature_dim = features[2].shape[1]  # Usually around 48-64 channels
            self.feature_size = features[2].shape[2:]  # Spatial dimensions (H, W)
        
        # Global average pooling to convert spatial features to vectors
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        
        # LSTM for temporal modeling
        self.lstm = nn.LSTM(
            input_size=self.feature_dim,  # Flattened feature vector size
            hidden_size=lstm_hidden_dim,
            num_layers=lstm_layers,
            batch_first=True,
            dropout=dropout if lstm_layers > 1 else 0,
            bidirectional=False
        )
        
        # Regression head
        self.dropout = nn.Dropout(dropout)
        self.regressor = nn.Sequential(
            nn.Linear(lstm_hidden_dim, 128),
            nn.ReLU(),
            nn.Dropout(dropout/2),
            nn.Linear(128, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )
    
    def forward(self, x):
        # x: [batch, seq_len, channels, height, width]
        batch_size, seq_len = x.shape[:2]
        
        # Extract CNN features for each frame
        features_list = []
        for t in range(seq_len):
            frame_features = self.backbone(x[:, t])
            # Use middle layer features (index 2) for better spatial info
            feat = frame_features[2]  # [batch, channels, H, W]
            
            # Global average pooling to get feature vector
            pooled_feat = self.global_pool(feat).squeeze(-1).squeeze(-1)  # [batch, channels]
            features_list.append(pooled_feat)
        
        # Stack features: [batch, seq_len, feature_dim]
        features = torch.stack(features_list, dim=1)
        
        # Pass through LSTM
        lstm_out, (h_n, c_n) = self.lstm(features)
        # lstm_out: [batch, seq_len, hidden_dim]
        
        # Use final timestep output
        final_features = lstm_out[:, -1, :]  # [batch, hidden_dim]
        
        # Regression
        final_features = self.dropout(final_features)
        speed = self.regressor(final_features)
        
        return speed



