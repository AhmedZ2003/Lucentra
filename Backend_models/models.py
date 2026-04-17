import os
import cv2
import torch
import torch.nn as nn
import timm
import numpy as np
from torchvision import transforms
import ptlflow
from ptlflow.utils import flow_utils
from utils import preprocess, apply_threshold_ema_smoothing, apply_ema_gaussian_smoothing, apply_ema_smoothing, apply_gaussian_smoothing, apply_kalman_smoothing, apply_butterworth_filter
from ptlflow.utils.io_adapter import IOAdapter
from tqdm import tqdm


class EfficientNetV2TinyModel(nn.Module):
    def __init__(self, pretrained=True, dropout_rate=0.1):
        super(EfficientNetV2TinyModel, self).__init__()
        
        self.base_model = timm.create_model('efficientnetv2_rw_t', pretrained=pretrained, num_classes=0)
        num_features = self.base_model.num_features
        
        self.head = nn.Sequential(
            nn.Dropout(dropout_rate),
            nn.Linear(num_features, 1),
        )
        
    def forward(self, x):
        features = self.base_model(x)
        output = self.head(features)
        return output


def get_speeds_from_video(video_path, weights_path, model_name='fastflownet', alpha=0.3, threshold=2.0, sigma=1.0, smoothing_type="ema_threshold", use_smoothing=True, fps=30.0, cutoff_hz=1.0):
    """
    model_name: 'fastflownet' or 'dpflow'
    Types of smoothing:
    - "ema_threshold": apply_threshold_ema_smoothing
    - "ema_gaussian": apply_ema_gaussian_smoothing
    - "ema": apply_ema_smoothing
    - "gaussian": apply_gaussian_smoothing
    """

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    weights_path = os.path.join(weights_path, f'{model_name}_best.pth')
    
    # Load optical flow model
    flow_model = ptlflow.get_model(model_name, ckpt_path='kitti').to(device)
    flow_model.eval()
    
    # Load speed estimation model
    speed_model = EfficientNetV2TinyModel(pretrained=False, dropout_rate=0.2).to(device)
    speed_model.load_state_dict(torch.load(weights_path, map_location=device))
    speed_model.eval()

    print(f"Loaded {model_name} for optical flow and EfficientNetV2Tiny for speed estimation.")
    
    # Define transform for flow images
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Resize((224, 224)),
    ])
    
    speeds = [0.0]  # First frame has speed 0

    cap = cv2.VideoCapture(video_path)
    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        print("Error: Unable to read video.")
        return speeds
    
    if model_name == 'dpflow':
        print("Using DPFlow model for optical flow estimation.")
        with torch.no_grad():
            while True:
                ret, curr_frame = cap.read()
                if not ret:
                    break

                # Preprocess frames for flow
                img1 = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2RGB)
                img2 = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2RGB)
                
                # 2. CRITICAL: Use IOAdapter to automatically handle tensor formatting & padding
                io_adapter = IOAdapter(flow_model, img1.shape[:2])
                inputs = io_adapter.prepare_inputs([img1, img2])
                
                # Safely move the prepared inputs to your GPU/CPU
                inputs = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}

                pred = flow_model(inputs)
                    
                # 3. Unpad the prediction so it matches your original image dimensions
                pred = io_adapter.unscale(pred)
                flow = pred['flows'][0, 0].cpu()

                flow = torch.clamp(flow, min=-150.0, max=150.0)

                # Normalized Flow using Tensor Input
                flow_rgb = flow_utils.flow_to_rgb(flow, background='dark').permute(1, 2, 0).numpy()
                
                # Preprocess flow for speed model
                # 1. Use EXACT same resizer as Training (cv2 instead of PyTorch transform)
                flow_rgb = cv2.resize(flow_rgb, (224, 224))

                # 2. Simulate the exact plt.imsave -> plt.imread 8-bit PNG quantization sequence from dataloader
                flow_rgb = np.clip(flow_rgb, 0.0, 1.0)
                flow_rgb = (flow_rgb * 255.0).astype(np.uint8).astype(np.float32) / 255.0

                # 3. Just use PyTorch to format shape (H,W,C -> C,H,W) like your PreprocessedSpeedDataset
                flow_tensor = transforms.ToTensor()(flow_rgb).to(device)

                # add .unsqueeze(0) to match batch shape
                flow_tensor = flow_tensor.unsqueeze(0) 
                
                # Predict speed
                speed_pred = speed_model(flow_tensor).item()

                # Apply EMA smoothing
                speeds.append(speed_pred)
                
                # Update previous frame
                prev_frame = curr_frame


    else:
        print("Using FastFlowNet model for optical flow estimation. Sequential")
        with torch.no_grad():
            while True:
                ret, curr_frame = cap.read()
                if not ret:
                    break

                # Preprocess frames for flow
                img1 = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2RGB)
                img2 = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2RGB)
                
                img1 = preprocess(img1)
                img2 = preprocess(img2)

                # 2. CRITICAL: Use IOAdapter to automatically handle tensor formatting & padding
                io_adapter = IOAdapter(flow_model, img1.shape[:2])
                inputs = io_adapter.prepare_inputs([img1, img2])
                
                # Safely move the prepared inputs to your GPU/CPU
                inputs = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}

                pred = flow_model(inputs)
                    
                # 3. Unpad the prediction so it matches your original image dimensions
                pred = io_adapter.unscale(pred)
                flow = pred['flows'][0, 0].cpu()

                # Normalized Flow using Tensor Input
                flow_rgb = flow_utils.flow_to_rgb(flow, background='dark').permute(1, 2, 0).numpy()
                
                # Preprocess flow for speed model
                flow_tensor = transform(flow_rgb).unsqueeze(0).to(device)
                
                # Predict speed
                speed_pred = speed_model(flow_tensor).item()

                # Apply EMA smoothing
                speeds.append(speed_pred)
                
                # Update previous frame
                prev_frame = curr_frame

    
    cap.release()

    if use_smoothing:
        if smoothing_type == "ema_threshold":
            speeds = apply_threshold_ema_smoothing(speeds, alpha=alpha, threshold=threshold)
        elif smoothing_type == "ema_gaussian":
            speeds = apply_ema_gaussian_smoothing(speeds, alpha=alpha, sigma=sigma)
        elif smoothing_type == "ema":
            speeds = apply_ema_smoothing(speeds, alpha=alpha)
        elif smoothing_type == "gaussian":
            speeds = apply_gaussian_smoothing(speeds, sigma=sigma)
        elif smoothing_type == 'kalman':
            speeds = apply_kalman_smoothing(speeds, process_noise=0.1, measurement_noise=5.0, apply_gaussian=True, sigma=sigma)
        elif smoothing_type == 'butterworth':
            speeds = apply_butterworth_filter(speeds, fps=fps, cutoff_hz=cutoff_hz)

    # if any speed value is negative, set it to zero
    speeds = [max(0.0, s) for s in speeds]

    return speeds


def get_speeds_from_video_batch_process(video_path, weights_path, model_name='fastflownet', alpha=0.3, threshold=2.0, sigma=1.0, smoothing_type="ema_threshold", use_smoothing=True, fps=30.0, cutoff_hz=1.0):
    """
    model_name: 'fastflownet' or 'dpflow'
    Types of smoothing:
    - "ema_threshold": apply_threshold_ema_smoothing
    - "ema_gaussian": apply_ema_gaussian_smoothing
    - "ema": apply_ema_smoothing
    - "gaussian": apply_gaussian_smoothing
    """

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    weights_path = os.path.join(weights_path, f'{model_name}_best.pth')
    
    # Load optical flow model
    flow_model = ptlflow.get_model(model_name, ckpt_path='kitti').to(device)
    flow_model.eval()
    
    # Load speed estimation model
    speed_model = EfficientNetV2TinyModel(pretrained=False, dropout_rate=0.2).to(device)
    speed_model.load_state_dict(torch.load(weights_path, map_location=device))
    speed_model.eval()
    
    # Define transform for flow images
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Resize((224, 224)),
    ])
    
    # Read all frames
    cap = cv2.VideoCapture(video_path)
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Unable to read video.")
            break
        frames.append(frame)
    cap.release()
    
    if len(frames) < 2:
        return [0.0], 0, 0
    
    speeds = [0.0]  # First frame has speed 0

    with torch.no_grad():
        # Compute optical flows sequentially (model doesn't support batching for flows)
        flow_tensors = []
        
        if model_name == 'dpflow':
            print("Using DPFlow model for optical flow estimation (Batch).")
            for i in tqdm(range(len(frames) - 1), desc="Processing Video", unit="pair"):
                # Preprocess frames for flow
                img1 = cv2.cvtColor(frames[i], cv2.COLOR_BGR2RGB)
                img2 = cv2.cvtColor(frames[i + 1], cv2.COLOR_BGR2RGB)
                
                # IOAdapter handles tensor formatting & padding
                io_adapter = IOAdapter(flow_model, img1.shape[:2])
                inputs = io_adapter.prepare_inputs([img1, img2])
                
                # Move to GPU/CPU
                inputs = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}

                pred = flow_model(inputs)
                    
                # Unpad the prediction
                pred = io_adapter.unscale(pred)
                flow = pred['flows'][0, 0].cpu()

                flow = torch.clamp(flow, min=-150.0, max=150.0)

                # Normalized Flow using Tensor Input
                flow_rgb = flow_utils.flow_to_rgb(flow, background='dark').permute(1, 2, 0).numpy()
                
                # 1. Use EXACT same resizer as Training (cv2 instead of PyTorch transform)
                flow_rgb = cv2.resize(flow_rgb, (224, 224))

                # 2. Simulate the exact plt.imsave -> plt.imread 8-bit PNG quantization sequence from dataloader
                flow_rgb = np.clip(flow_rgb, 0.0, 1.0)
                flow_rgb = (flow_rgb * 255.0).astype(np.uint8).astype(np.float32) / 255.0

                # 3. Just use PyTorch to format shape (H,W,C -> C,H,W) like your PreprocessedSpeedDataset
                flow_tensor = transforms.ToTensor()(flow_rgb).to(device)



                flow_tensors.append(flow_tensor)
        else:
            print("Using FastFlowNet model for optical flow estimation (Batch).")
            for i in tqdm(range(len(frames) - 1), desc="Processing Video", unit="pair"):
                # Preprocess frames for flow
                img1 = cv2.cvtColor(frames[i], cv2.COLOR_BGR2RGB)
                img2 = cv2.cvtColor(frames[i + 1], cv2.COLOR_BGR2RGB)
                
                img1 = preprocess(img1)
                img2 = preprocess(img2)

                # IOAdapter handles tensor formatting & padding
                io_adapter = IOAdapter(flow_model, img1.shape[:2])
                inputs = io_adapter.prepare_inputs([img1, img2])
                
                # Move to GPU/CPU
                inputs = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}

                pred = flow_model(inputs)
                    
                # Unpad the prediction
                pred = io_adapter.unscale(pred)
                flow = pred['flows'][0, 0].cpu()

                # Normalized Flow using Tensor Input
                flow_rgb = flow_utils.flow_to_rgb(flow, background='dark').permute(1, 2, 0).numpy()
                
                # Preprocess flow for speed model
                flow_tensor = transform(flow_rgb).to(device)
                flow_tensors.append(flow_tensor)

        # Batch predict speeds
        if flow_tensors:
            flow_batch = torch.stack(flow_tensors, dim=0)  # [num_pairs, 3, 224, 224]
            speed_preds = speed_model(flow_batch).squeeze().cpu().numpy()
            
            # Handle the case where speed_preds is a single value (0-d array)
            if speed_preds.ndim == 0:
                speeds.append(float(speed_preds))
            else:
                speeds.extend(speed_preds.tolist())
    
    if use_smoothing:
        if smoothing_type == "ema_threshold":
            speeds = apply_threshold_ema_smoothing(speeds, alpha=alpha, threshold=threshold)
        elif smoothing_type == "ema_gaussian":
            speeds = apply_ema_gaussian_smoothing(speeds, alpha=alpha, sigma=sigma)
        elif smoothing_type == "ema":
            speeds = apply_ema_smoothing(speeds, alpha=alpha)
        elif smoothing_type == "gaussian":
            speeds = apply_gaussian_smoothing(speeds, sigma=sigma)
        elif smoothing_type == 'kalman':
            speeds = apply_kalman_smoothing(speeds, process_noise=0.1, measurement_noise=5.0, apply_gaussian=True, sigma=sigma)
        elif smoothing_type == 'butterworth':
            speeds = apply_butterworth_filter(speeds, fps=fps, cutoff_hz=cutoff_hz)

    # if any speed value is negative, set it to zero
    speeds = [max(0.0, s) for s in speeds]
    
    return speeds  # Timing not measured in batched version


# * Run this file first to test the model loading and speed estimation
if __name__ == "__main__":

    # * Path settings
    video_path = r"D:\D-Documents\Self-Improvement\Python\Computer_Vision\Speed Estimation\Speed_Estimation_Cleaned\Dataset\Processed\Train\videos\2011_09_26_drive_0029_sync.mp4"
    # video_path = r"D:\D-Documents\Self-Improvement\Python\Computer_Vision\Speed Estimation\Speed_Estimation_FYP_Cleaned\Speed_Estimation_Module_Lucentra\videos\stuttgart_01_demo_video.mp4"
    weights_path = r'D:\D-Documents\Self-Improvement\Python\Computer_Vision\Speed Estimation\Speed_Estimation_FYP_Cleaned\Speed_Estimation_Module_Lucentra\weights'

    # * Model settings
    model_name = 'fastflownet'  # Choose from: 'fastflownet', 'dpflow'

    # * Smoothing parameters
    alpha = 0.5 # 0.3 - 0.5 works well
    threshold = 2.0
    sigma = 4.5  # 4-5 gives good smoothing
    fps=30.0
    cutoff_hz=1.0
    smoothing_type = "butterworth"  # Choose from: "ema_threshold", "ema_gaussian", "ema", "gaussian"
    
    # * For single processing
    # speeds  = get_speeds_from_video(video_path, weights_path, model_name=model_name, alpha=alpha, threshold=threshold, sigma=sigma, smoothing_type=smoothing_type, use_smoothing=True, fps=30.0, cutoff_hz=1.0)

    # * For batch processing, Can be Faster for long videos
    speeds  = get_speeds_from_video_batch_process(video_path, weights_path, model_name=model_name, alpha=alpha, threshold=threshold, sigma=sigma, smoothing_type=smoothing_type, use_smoothing=True, fps=30.0, cutoff_hz=1.0)




# ? Explanation of smoothing parameters:
# * Alpha: High → light smoothing; Low → heavy smoothing.
# * Threshold: High → preserves big fluctuations; Low → smooths small fluctuations.
# * Sigma: High → strong smoothing; Low → light smoothing.

# ? Types of smoothing:
# * - "ema_threshold": apply_threshold_ema_smoothing
# * - "ema_gaussian": apply_ema_gaussian_smoothing
# * - "ema": apply_ema_smoothing
# * - "gaussian": apply_gaussian_smoothing

    import matplotlib.pyplot as plt

    def plot_and_save_speeds(speeds, save_path=f'{model_name}_speeds_plot.png'):
        plt.figure(figsize=(10, 6))
        plt.plot(speeds, label='Speed')
        plt.xlabel('Frame')
        plt.ylabel('Speed')
        plt.title('Speed Over Time')
        plt.legend()
        plt.grid(True)
        plt.savefig(save_path)
        plt.close()
        print(f"Plot saved to {save_path}")

    # Example usage
    plot_and_save_speeds(speeds)


# Single processing:
# * FastFlowNet: 23.34 s
# * DPFlow: 66.17 s

# Batch processing:
# * FastFlowNet: 20.54 s
# * DPFlow: 62.95 s