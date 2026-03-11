import torch
import torchvision.transforms as transforms
import cv2
import os
import yaml
from model import SpeedEstimationModel_convlstm, SpeedEstimationModel_cnn_lstm
import numpy as np
from scipy.ndimage import gaussian_filter1d

def get_speed(model, video_path, device, transform):
    """
    Estimate speed for each frame in a video using ConvLSTM model.
    
    Args:
        model: Trained SpeedEstimationModel (ConvLSTM-based)
        video_path: Path to input video file (.mp4)
        device: torch.device for inference
    
    Returns:
        List of speed predictions (float) with length equal to number of frames.
        First frame speed is set to 0.0
    """

    model.eval()
    
    # Define preprocessing transform
    if transform is None:
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((224, 224)),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    speeds = [0.0]  # First frame has speed 0
    
    cap = cv2.VideoCapture(video_path)

    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        return speeds
    
    prev_frame = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2RGB)
    
    with torch.no_grad():
        while True:
            ret, curr_frame = cap.read()
            if not ret:
                break
            
            curr_frame = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2RGB)
            
            # Preprocess frames
            prev_tensor = transform(prev_frame).unsqueeze(0)  # [1, 3, 224, 224]
            curr_tensor = transform(curr_frame).unsqueeze(0)  # [1, 3, 224, 224]
            
            # Stack as sequence: [batch=1, seq_len=2, channels=3, H=224, W=224]
            frame_sequence = torch.stack([prev_tensor, curr_tensor], dim=1).to(device)
            
            # Get prediction
            speed_pred = model(frame_sequence)
            speeds.append(speed_pred.item())
            
            # Update previous frame
            prev_frame = curr_frame

    
    cap.release()
    return speeds


def get_speed_running_avg(model, video_path, device, transform, avg_ratio=0.4):
    """
    Estimate speed for each frame in a video using ConvLSTM model with running average smoothing.
    
    Args:
        model: Trained SpeedEstimationModel (ConvLSTM-based)
        video_path: Path to input video file (.mp4)
        device: torch.device for inference
        transform: Preprocessing transform for frames
        avg_ratio: Smoothing factor (0.0-1.0). Higher = more weight to new prediction.
                   1.0 = no smoothing, 0.0 = keep previous speed
    
    Returns:
        List of speed predictions (float) with length equal to number of frames.
        First frame speed is set to 0.0
    """

    model.eval()
    
    # Define preprocessing transform
    if transform is None:
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((224, 224)),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    speeds = [0.0]  # First frame has speed 0
    running_avg = 0.0  # Initialize running average
    
    cap = cv2.VideoCapture(video_path)

    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        return speeds
    
    prev_frame = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2RGB)
    
    with torch.no_grad():
        while True:
            ret, curr_frame = cap.read()
            if not ret:
                break
            
            curr_frame = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2RGB)
            
            # Preprocess frames
            prev_tensor = transform(prev_frame).unsqueeze(0)  # [1, 3, 224, 224]
            curr_tensor = transform(curr_frame).unsqueeze(0)  # [1, 3, 224, 224]
            
            # Stack as sequence: [batch=1, seq_len=2, channels=3, H=224, W=224]
            frame_sequence = torch.stack([prev_tensor, curr_tensor], dim=1).to(device)
            
            # Get prediction
            speed_pred = model(frame_sequence).item()
            
            # Update running average: new_avg = (1-alpha)*old_avg + alpha*new_value
            running_avg = (1 - avg_ratio) * running_avg + avg_ratio * speed_pred
            speeds.append(running_avg)
            
            # Update previous frame
            prev_frame = curr_frame

    
    cap.release()
    return speeds


def get_speed_gaussian_smoothing(model, video_path, device, transform, smooth_sigma=5.0):
    """
    Estimate speed for each frame in a video using ConvLSTM model.
    
    Args:
        model: Trained SpeedEstimationModel (ConvLSTM-based)
        video_path: Path to input video file (.mp4)
        device: torch.device for inference
        transform: Preprocessing transform for frames
        smooth_sigma: Standard deviation for Gaussian smoothing (default=1.0).
                      Higher values = more smoothing. Use 0 to disable smoothing.
    
    Returns:
        List of speed predictions (float) with length equal to number of frames.
        First frame speed is set to 0.0
    """

    model.eval()
    
    # Define preprocessing transform
    if transform is None:
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((224, 224)),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    speeds = [0.0]  # First frame has speed 0
    
    cap = cv2.VideoCapture(video_path)

    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        return speeds
    
    prev_frame = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2RGB)
    
    with torch.no_grad():
        while True:
            ret, curr_frame = cap.read()
            if not ret:
                break
            
            curr_frame = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2RGB)
            
            # Preprocess frames
            prev_tensor = transform(prev_frame).unsqueeze(0)  # [1, 3, 224, 224]
            curr_tensor = transform(curr_frame).unsqueeze(0)  # [1, 3, 224, 224]
            
            # Stack as sequence: [batch=1, seq_len=2, channels=3, H=224, W=224]
            frame_sequence = torch.stack([prev_tensor, curr_tensor], dim=1).to(device)
            
            # Get prediction
            speed_pred = model(frame_sequence)
            speeds.append(speed_pred.item())
            
            # Update previous frame
            prev_frame = curr_frame

    cap.release()
    
    # Apply Gaussian smoothing to reduce small fluctuations
    if smooth_sigma > 0 and len(speeds) > 1:
        speeds_array = np.array(speeds)
        smoothed_speeds = gaussian_filter1d(speeds_array, sigma=smooth_sigma, mode='nearest')
        speeds = smoothed_speeds.tolist()
    
    return speeds


def get_speed_gaussian_running_avg_smoothing(model, video_path, device, transform, avg_ratio=0.4, smooth_sigma=5.0):
    """
    Estimate speed for each frame in a video using ConvLSTM model with hybrid smoothing.
    Applies running average during inference, then Gaussian smoothing at the end.
    
    Args:
        model: Trained SpeedEstimationModel (ConvLSTM-based)
        video_path: Path to input video file (.mp4)
        device: torch.device for inference
        transform: Preprocessing transform for frames
        avg_ratio: Smoothing factor for running average (0.0-1.0). 
                   Higher = more weight to new prediction. Default=0.7
        smooth_sigma: Standard deviation for Gaussian smoothing (default=1.0).
                      Higher values = more smoothing. Use 0 to disable Gaussian smoothing.
    
    Returns:
        List of speed predictions (float) with length equal to number of frames.
        First frame speed is set to 0.0
    """

    model.eval()
    
    # Define preprocessing transform
    if transform is None:
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((224, 224)),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    speeds = [0.0]  # First frame has speed 0
    running_avg = 0.0  # Initialize running average
    
    cap = cv2.VideoCapture(video_path)

    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        return speeds
    
    prev_frame = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2RGB)
    
    with torch.no_grad():
        while True:
            ret, curr_frame = cap.read()
            if not ret:
                break
            
            curr_frame = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2RGB)
            
            # Preprocess frames
            prev_tensor = transform(prev_frame).unsqueeze(0)  # [1, 3, 224, 224]
            curr_tensor = transform(curr_frame).unsqueeze(0)  # [1, 3, 224, 224]
            
            # Stack as sequence: [batch=1, seq_len=2, channels=3, H=224, W=224]
            frame_sequence = torch.stack([prev_tensor, curr_tensor], dim=1).to(device)
            
            # Get prediction
            speed_pred = model(frame_sequence).item()
            
            # Update running average: new_avg = (1-alpha)*old_avg + alpha*new_value
            running_avg = (1 - avg_ratio) * running_avg + avg_ratio * speed_pred
            speeds.append(running_avg)
            
            # Update previous frame
            prev_frame = curr_frame

    cap.release()
    
    # Apply Gaussian smoothing to reduce remaining small fluctuations
    if smooth_sigma > 0 and len(speeds) > 1:
        speeds_array = np.array(speeds)
        smoothed_speeds = gaussian_filter1d(speeds_array, sigma=smooth_sigma, mode='nearest')
        speeds = smoothed_speeds.tolist()
    
    return speeds


def get_speed_ema(model, video_path, device, transform, alpha=0.3):
    """
    Estimate speed for each frame in a video using ConvLSTM model.
    
    Args:
        model: Trained SpeedEstimationModel (ConvLSTM-based)
        video_path: Path to input video file (.mp4)
        device: torch.device for inference
        ema: Smoothing factor (0.1-0.2: heavy, 0.3-0.4: moderate, 0.5-0.7: light)
    Returns:
        List of speed predictions (float) with length equal to number of frames.
        First frame speed is set to 0.0
    """
    model.eval()
    
    # Define preprocessing transform
    if transform is None:
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((224, 224)),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    speeds = [0.0]  # First frame has speed 0
    
    cap = cv2.VideoCapture(video_path)
    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        return speeds
    
    prev_frame = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2RGB)
    
    # EMA smoothing parameters
    alpha = alpha  # Smoothing factor (0.1-0.2: heavy, 0.3-0.4: moderate, 0.5-0.7: light)
    ema_speed = 0.0  # Initialize EMA with first frame speed
    
    with torch.no_grad():
        while True:
            ret, curr_frame = cap.read()
            if not ret:
                break
            
            curr_frame = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2RGB)
            
            # Preprocess frames
            prev_tensor = transform(prev_frame).unsqueeze(0)  # [1, 3, 224, 224]
            curr_tensor = transform(curr_frame).unsqueeze(0)  # [1, 3, 224, 224]
            
            # Stack as sequence: [batch=1, seq_len=2, channels=3, H=224, W=224]
            frame_sequence = torch.stack([prev_tensor, curr_tensor], dim=1).to(device)
            
            # Get prediction
            speed_pred = model(frame_sequence).item()
            
            # Apply EMA: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
            ema_speed = alpha * speed_pred + (1 - alpha) * ema_speed
            speeds.append(ema_speed)
            
            # Update previous frame
            prev_frame = curr_frame
    
    cap.release()
    return speeds


def get_speed_ema_gaussian_smoothing(model, video_path, device, transform, alpha=0.3, smooth_sigma=5.0):
    """
    Estimate speed for each frame in a video using ConvLSTM model.
    
    Args:
        model: Trained SpeedEstimationModel (ConvLSTM-based)
        video_path: Path to input video file (.mp4)
        device: torch.device for inference
        ema: Smoothing factor (0.1-0.2: heavy, 0.3-0.4: moderate, 0.5-0.7: light)
        smooth_sigma: Standard deviation for Gaussian smoothing (default=1.0).
                      Higher values = more smoothing. Use 0 to disable smoothing.
    
    Returns:
        List of speed predictions (float) with length equal to number of frames.
        First frame speed is set to 0.0
    """
    model.eval()
    
    # Define preprocessing transform
    if transform is None:
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((224, 224)),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    speeds = [0.0]  # First frame has speed 0
    
    cap = cv2.VideoCapture(video_path)
    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        return speeds
    
    prev_frame = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2RGB)
    
    # EMA smoothing parameters
    alpha = alpha  # Smoothing factor (0.1-0.2: heavy, 0.3-0.4: moderate, 0.5-0.7: light)
    ema_speed = 0.0  # Initialize EMA with first frame speed
    
    with torch.no_grad():
        while True:
            ret, curr_frame = cap.read()
            if not ret:
                break
            
            curr_frame = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2RGB)
            
            # Preprocess frames
            prev_tensor = transform(prev_frame).unsqueeze(0)  # [1, 3, 224, 224]
            curr_tensor = transform(curr_frame).unsqueeze(0)  # [1, 3, 224, 224]
            
            # Stack as sequence: [batch=1, seq_len=2, channels=3, H=224, W=224]
            frame_sequence = torch.stack([prev_tensor, curr_tensor], dim=1).to(device)
            
            # Get prediction
            speed_pred = model(frame_sequence).item()
            
            # Apply EMA: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
            ema_speed = alpha * speed_pred + (1 - alpha) * ema_speed
            speeds.append(ema_speed)
            
            # Update previous frame
            prev_frame = curr_frame
    
    cap.release()

    # Apply Gaussian smoothing to reduce remaining small fluctuations
    if smooth_sigma > 0 and len(speeds) > 1:
        speeds_array = np.array(speeds)
        smoothed_speeds = gaussian_filter1d(speeds_array, sigma=smooth_sigma, mode='nearest')
        speeds = smoothed_speeds.tolist()

    return speeds




if __name__ == "__main__":

    # Load configuration from YAML
    config_path = os.path.join(os.path.dirname(__file__), 'configs.yaml')
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Extract configs for CNN+LSTM
    image_size = tuple(config['preprocessing']['image_size'])
    dropout_rate = config['model']['dropout']
    lstm_hidden_dim = config['model']['lstm_hidden_dim']
    lstm_layers = config['model']['lstm_layers']

    print(f"Loaded config: image_size={image_size}, dropout={dropout_rate}")
    print(f"LSTM: hidden_dim={lstm_hidden_dim}, layers={lstm_layers}")

    # Preprocessing transform - MUST match training preprocessing
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Resize(image_size),
        transforms.Normalize(
            mean=config['preprocessing']['normalize']['mean'], 
            std=config['preprocessing']['normalize']['std']
        )
    ])

    # Device configuration
    if config['device'] == 'auto':
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(config['device'])
    
    print(f"Using device: {device}")
    
    # Initialize CNN+LSTM model
    model = SpeedEstimationModel_cnn_lstm(
        backbone=config['model']['backbone'],
        pretrained=config['model']['pretrained'],
        lstm_hidden_dim=lstm_hidden_dim,
        lstm_layers=lstm_layers,
        dropout=dropout_rate
    ).to(device)

    # Load trained weights
    checkpoint_path = os.path.join(os.path.dirname(__file__), config['paths']['checkpoint'])
    
    if os.path.exists(checkpoint_path):
        checkpoint = torch.load(checkpoint_path, map_location=device)
        
        # Handle different checkpoint formats
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
            print(f"Loaded model from epoch {checkpoint.get('epoch', 'unknown')}")
            print(f"Training loss: {checkpoint.get('train_loss', 'N/A'):.4f}")
            print(f"Validation loss: {checkpoint.get('val_loss', 'N/A'):.4f}")
        else:
            model.load_state_dict(checkpoint)
            print("Loaded model weights")
    else:
        print(f"Warning: No checkpoint found at {checkpoint_path}")
        print("Using untrained model")

    video_path = os.path.join(os.path.dirname(__file__), config['paths']['video'])
    
    # speeds = get_speed(model, video_path, device, transform)

    # * Change Parameters alpha, smooth_sigma, avg_ratio here for different smoothing methods
    # * avg_ratio: 0.0-1.0 (0.0=heavy, 1.0=no smoothing)
    # * smooth_sigma: 0.0-20.0 (0.0=no smoothing, higher=more smoothing)
    # * alpha: 0.1-1.0 (0.1=heavy, 0.3=moderate, 0.5=light)
    
    # speeds = get_speed_running_avg(model, video_path, device, transform, avg_ratio=0.4)
    # speeds = get_speed_gaussian_smoothing(model, video_path, device, transform, smooth_sigma=5.0)
    # speed = get_speed_gaussian_running_avg_smoothing(model, video_path, device, transform, avg_ratio=0.4, smooth_sigma=5.0)
    # speeds = get_speed_ema_gaussian_smoothing(model, video_path, device, transform, alpha=0.1, smooth_sigma=9.0)
    speeds = get_speed_ema(model, video_path, device, transform, alpha=0.1)

    print(f"\nProcessed {len(speeds)} frames")
    print(f"Speed predictions: {speeds[:10]}...")  # Show first 10 speeds

    # Save speeds to .txt file
    output_path = os.path.join(os.path.dirname(__file__), f'get_speed_predicted_speeds.txt')
    with open(output_path, 'w') as f:
        for speed in speeds:
            f.write(f"{speed}\n")
    
    print(f"\nSpeeds saved to: {output_path}")
    print(f"Total speeds saved: {len(speeds)}")

