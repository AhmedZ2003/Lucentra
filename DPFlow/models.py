import cv2
import torch
import torch.nn as nn
import timm
import numpy as np
from torchvision import transforms
import ptlflow
from ptlflow.utils import flow_utils
from utils import preprocess, apply_threshold_ema_smoothing, apply_ema_gaussian_smoothing, apply_ema_smoothing, apply_gaussian_smoothing
import time
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


def get_speeds_from_video(video_path, weights_path, alpha=0.3, threshold=2.0, sigma=1.0, smoothing_type="ema_threshold", use_smoothing=True):
    """
    Types of smoothing:
    - "ema_threshold": apply_threshold_ema_smoothing
    - "ema_gaussian": apply_ema_gaussian_smoothing
    - "ema": apply_ema_smoothing
    - "gaussian": apply_gaussian_smoothing
    """

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Load optical flow model
    flow_model = ptlflow.get_model('dpflow', ckpt_path='kitti').to(device)
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
    
    speeds = [0.0]  # First frame has speed 0

    cap = cv2.VideoCapture(video_path)
    # Read first frame
    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        print("Error: Unable to read video.")
        return speeds
    
    # with torch.no_grad():
    #     while True:
    #         ret, curr_frame = cap.read()
    #         if not ret:
    #             break

    #         # Preprocess frames for flow
    #         img1 = preprocess(prev_frame)
    #         img2 = preprocess(curr_frame)

    #         # Convert to tensor
    #         imgs = np.stack([img1, img2], axis=0)
    #         imgs = torch.from_numpy(imgs).permute(0, 3, 1, 2).float().unsqueeze(0).to(device)

    #         # Compute optical flow
    #         pred = flow_model({"images": imgs})
    #         flow = pred['flows'][0, 0].cpu()

    #         # Convert flow to RGB
    #         flow_rgb = flow_utils.flow_to_rgb(flow, background='dark').permute(1, 2, 0).numpy()
    #         flow_rgb = cv2.resize(flow_rgb, (224, 224))
            
    #         # Preprocess flow for speed model
    #         flow_tensor = transform(flow_rgb).unsqueeze(0).to(device)
            
    #         # Predict speed
    #         speed_pred = speed_model(flow_tensor).item()

    #         # Apply EMA smoothing
    #         speeds.append(speed_pred)
            
    #         # Update previous frame
    #         prev_frame = curr_frame
    
    # cap.release()
    
    with torch.no_grad():
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        for _ in tqdm(range(frame_count - 1), desc="Processing Frames", unit="frame"):  # Add tqdm here
            ret, curr_frame = cap.read()
            if not ret:
                break

            # Preprocess frames for flow
            img1 = preprocess(prev_frame)
            img2 = preprocess(curr_frame)

            # Convert to tensor
            imgs = np.stack([img1, img2], axis=0)
            imgs = torch.from_numpy(imgs).permute(0, 3, 1, 2).float().unsqueeze(0).to(device)

            # Compute optical flow
            pred = flow_model({"images": imgs})
            flow = pred['flows'][0, 0].cpu()

            # Convert flow to RGB
            flow_rgb = flow_utils.flow_to_rgb(flow, background='dark').permute(1, 2, 0).numpy()
            flow_rgb = cv2.resize(flow_rgb, (224, 224))
            
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

    # if any speed value is negative, set it to zero
    speeds = [max(0.0, s) for s in speeds]

    return speeds


def get_speeds_from_video_batch_process(video_path, weights_path, alpha=0.3, threshold=2.0, sigma=1.0, smoothing_type="ema_threshold", use_smoothing=True):
    """
    Types of smoothing:
    - "ema_threshold": apply_threshold_ema_smoothing
    - "ema_gaussian": apply_ema_gaussian_smoothing
    - "ema": apply_ema_smoothing
    - "gaussian": apply_gaussian_smoothing
    """

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    # start_time = time.time()
    
    # Load optical flow model
    flow_model = ptlflow.get_model('dpflow', ckpt_path='kitti').to(device)
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
        for i in range(len(frames) - 1):
            img1 = preprocess(frames[i])
            img2 = preprocess(frames[i + 1])
            imgs = np.stack([img1, img2], axis=0)
            imgs = torch.from_numpy(imgs).permute(0, 3, 1, 2).float().unsqueeze(0).to(device)
            
            pred = flow_model({"images": imgs})
            flow = pred['flows'][0, 0].cpu()
            
            flow_rgb = flow_utils.flow_to_rgb(flow, background='dark').permute(1, 2, 0).numpy()
            flow_rgb = cv2.resize(flow_rgb, (224, 224))
            flow_tensor = transform(flow_rgb).to(device)
            flow_tensors.append(flow_tensor)
        
        # Batch predict speeds
        flow_batch = torch.stack(flow_tensors, dim=0)  # [num_pairs, 3, 224, 224]
        speed_preds = speed_model(flow_batch).squeeze().cpu().numpy()
        
        speeds.extend(speed_preds)
    
    if use_smoothing:
        if smoothing_type == "ema_threshold":
            speeds = apply_threshold_ema_smoothing(speeds, alpha=alpha, threshold=threshold)
        elif smoothing_type == "ema_gaussian":
            speeds = apply_ema_gaussian_smoothing(speeds, alpha=alpha, sigma=sigma)
        elif smoothing_type == "ema":
            speeds = apply_ema_smoothing(speeds, alpha=alpha)
        elif smoothing_type == "gaussian":
            speeds = apply_gaussian_smoothing(speeds, sigma=sigma)

    # end_time = time.time()
    # total_time = end_time - start_time
    # print(f"Total processing time: {total_time:.2f} seconds for {len(frames)} frames.")

    
    # if any speed value is negative, set it to zero
    speeds = [max(0.0, s) for s in speeds]
    
    return speeds  # Timing not measured in batched version


# * Run this file first to test the model loading and speed estimation
if __name__ == "__main__":

    # * Path settings
    # video_path = r"D:\D-Documents\Self-Improvement\Python\Computer_Vision\Speed Estimation\Speed_Estimation_Cleaned\Dataset\Processed\Train\videos\2011_09_26_drive_0029_sync.mp4"
    video_path = r"D:\D-Documents\Self-Improvement\Python\Computer_Vision\Speed Estimation\Speed_Estimation_Cleaned\Dataset\Processed\Train\videos\2011_09_26_drive_0029_sync.mp4"
    weights_path = r'D:\D-Documents\Self-Improvement\Python\Computer_Vision\Speed Estimation\Speed_Estimation_Cleaned\Experiments\DPFlow_Modular_for_Lucentra\weights\best_weight_resize_2'

    # * Smoothing parameters
    alpha = 0.5 # 0.3 - 0.5 works well
    threshold = 2.0
    sigma = 4.5  # 4-5 gives good smoothing
    smoothing_type = "ema_gaussian"  # Choose from: "ema_threshold", "ema_gaussian", "ema", "gaussian"
    
    # * For single processing
    speeds_1  = get_speeds_from_video(video_path, weights_path, alpha=alpha, threshold=threshold, sigma=sigma, smoothing_type=smoothing_type, use_smoothing=True)
    
    # * For batch processing, Can be Faster for long videos
    # speeds_2  = get_speeds_from_video_batch_process(video_path, weights_path, alpha=alpha, threshold=threshold, sigma=sigma, smoothing_type=smoothing_type, use_smoothing=True)


    # print(speeds_1)


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

    def plot_and_save_speeds(speeds, save_path='speeds_plot.png'):
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
    plot_and_save_speeds(speeds_1)