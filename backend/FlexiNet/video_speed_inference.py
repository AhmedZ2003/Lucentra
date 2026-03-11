"""
Video Speed Inference using FlexiNet
A simple and modular function to predict speed from MP4 videos.
"""

import os
import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from tqdm import tqdm

from model.FlexiNet import FlexiNet


def predict_speed_from_video(
    video_path,
    checkpoint_path,
    sequence_length=13,
    img_size=(64, 64),
    device=None,
    show_progress=True
):
    """
    Predict speed for each frame in an MP4 video using FlexiNet.
    
    Args:
        video_path (str): Path to the input MP4 video file
        checkpoint_path (str): Path to the pretrained model checkpoint (.pth file)
        sequence_length (int): Number of consecutive frames needed (default: 13)
        img_size (tuple): Target image size as (height, width) (default: (64, 64))
        device (torch.device or str): Device for inference ('cuda' or 'cpu'). 
                                      If None, automatically selects GPU if available
        show_progress (bool): Whether to show progress bar (default: True)
    
    Returns:
        list: Predicted speeds for each frame. First (sequence_length - 1) frames 
              will have speed = -1.0 due to insufficient context.
    
    Example:
        >>> speeds = predict_speed_from_video(
        ...     video_path='video.mp4',
        ...     checkpoint_path='pretrained_models/checkpoint_epoch_390_kitti_L1_best.pth'
        ... )
        >>> print(f"Total frames: {len(speeds)}")
        >>> print(f"Speed at frame 20: {speeds[20]:.4f} m/s")
    """
    
    # Validate inputs
    if not os.path.isfile(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
    if not os.path.isfile(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint file not found: {checkpoint_path}")
    
    # Set device
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    elif isinstance(device, str):
        device = torch.device(device)
    
    if show_progress:
        print(f"Using device: {device}")
    
    # Load the model
    model = _load_model(checkpoint_path, device)
    
    # Extract frames from video
    frames = _extract_frames_from_video(video_path, show_progress)
    
    if len(frames) < sequence_length:
        raise ValueError(
            f"Video has only {len(frames)} frames, but {sequence_length} frames "
            f"are required for prediction."
        )
    
    # Perform inference
    speeds = _infer_speeds(frames, model, device, sequence_length, img_size, show_progress)
    
    return speeds


def _load_model(checkpoint_path, device):
    """
    Load the FlexiNet model with pretrained weights.
    
    Args:
        checkpoint_path (str): Path to checkpoint file
        device (torch.device): Device to load model onto
        
    Returns:
        nn.Module: Loaded model in evaluation mode
    """
    # Initialize model
    model = FlexiNet(input_channels=1, num_classes=1)
    
    # Load checkpoint
    checkpoint = torch.load(checkpoint_path, map_location=device)
    
    # Handle different checkpoint formats
    if 'state_dict' in checkpoint:
        state_dict = checkpoint['state_dict']
    elif isinstance(checkpoint, dict):
        state_dict = checkpoint
    else:
        raise KeyError("Invalid checkpoint format")
    
    # Handle DataParallel wrapped models
    if list(state_dict.keys())[0].startswith('module.'):
        state_dict = {k.replace('module.', ''): v for k, v in state_dict.items()}
    
    # Load weights
    model.load_state_dict(state_dict)
    model = model.to(device)
    model.eval()
    
    return model


def _extract_frames_from_video(video_path, show_progress=True):
    """
    Extract all frames from an MP4 video.
    
    Args:
        video_path (str): Path to video file
        show_progress (bool): Whether to show progress
        
    Returns:
        list: List of frames as numpy arrays (BGR format)
    """
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        raise IOError(f"Cannot open video file: {video_path}")
    
    # Get total frame count
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    if show_progress:
        print(f"Video info: {total_frames} frames at {fps:.2f} FPS")
        print("Extracting frames from video...")
    
    frames = []
    pbar = tqdm(total=total_frames, desc="Reading frames", disable=not show_progress)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
        pbar.update(1)
    
    pbar.close()
    cap.release()
    
    if show_progress:
        print(f"Extracted {len(frames)} frames")
    
    return frames


def _preprocess_frame(frame, img_size=(64, 64)):
    """
    Preprocess a single frame for model input.
    
    Args:
        frame (np.ndarray): Frame in BGR format (OpenCV)
        img_size (tuple): Target size as (height, width)
        
    Returns:
        torch.Tensor: Preprocessed frame tensor
    """
    # Convert BGR to grayscale
    gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Convert to PIL Image
    pil_image = Image.fromarray(gray_frame)
    
    # Define transformation
    transform = transforms.Compose([
        transforms.Resize(img_size),
        transforms.ToTensor(),
    ])
    
    # Apply transformation
    frame_tensor = transform(pil_image)
    
    return frame_tensor


def _infer_speeds(frames, model, device, sequence_length, img_size, show_progress):
    """
    Perform speed inference on frames.
    
    Args:
        frames (list): List of video frames
        model (nn.Module): Loaded FlexiNet model
        device (torch.device): Device for inference
        sequence_length (int): Number of frames per sequence
        img_size (tuple): Image size
        show_progress (bool): Whether to show progress
        
    Returns:
        list: Predicted speeds
    """
    num_frames = len(frames)
    predicted_speeds = []
    
    # First (sequence_length - 1) frames have speed = -1
    for i in range(sequence_length - 1):
        predicted_speeds.append(-1.0)
    
    if show_progress:
        print(f"Predicting speeds for {num_frames} frames...")
    
    # Process sequences
    num_sequences = num_frames - sequence_length + 1
    
    with torch.no_grad():
        iterator = range(num_sequences)
        if show_progress:
            iterator = tqdm(iterator, desc="Inference", unit="sequence")
        
        for i in iterator:
            # Get sequence of frames
            sequence_frames = frames[i:i + sequence_length]
            
            # Preprocess each frame in the sequence
            sequence_tensors = []
            for frame in sequence_frames:
                frame_tensor = _preprocess_frame(frame, img_size)
                sequence_tensors.append(frame_tensor)
            
            # Stack frames: (sequence_length, C, H, W)
            sequence_batch = torch.stack(sequence_tensors, dim=0)
            
            # Add batch dimension: (1, sequence_length, C, H, W)
            sequence_batch = sequence_batch.unsqueeze(0).to(device)
            
            # Predict
            predicted_speed = model(sequence_batch)
            
            # Extract speed value
            speed_value = predicted_speed.item()
            predicted_speeds.append(speed_value)
    
    if show_progress:
        print(f"Inference complete!")
        valid_speeds = [s for s in predicted_speeds if s != -1.0]
        if valid_speeds:
            print(f"Speed statistics:")
            print(f"  Mean: {np.mean(valid_speeds):.4f} m/s")
            print(f"  Std:  {np.std(valid_speeds):.4f} m/s")
            print(f"  Min:  {np.min(valid_speeds):.4f} m/s")
            print(f"  Max:  {np.max(valid_speeds):.4f} m/s")
    
    return predicted_speeds


def save_speeds_to_file(speeds, output_path='predicted_speeds.txt', video_name='video'):
    """
    Save predicted speeds to a text file.
    
    Args:
        speeds (list): List of predicted speeds
        output_path (str): Path to output file
        video_name (str): Name of the video (for frame naming)
    """
    with open(output_path, 'w') as f:
        f.write("Frame_Index,Frame_Name,Predicted_Speed_m/s\n")
        for i, speed in enumerate(speeds):
            frame_name = f"{video_name}_frame_{i:06d}.png"
            f.write(f"{i},{frame_name},{speed:.6f}\n")
    
    print(f"Speeds saved to: {output_path}")


# Example usage
if __name__ == '__main__':
    # Example: Process a video file
    video_path = r'F:\FlexiNet_Model\video_1.mp4'
    checkpoint_path = r'F:\FlexiNet_Model\pretrained_models\checkpoint_epoch_390_kitti_L1_best.pth'
    
    # Predict speeds
    speeds = predict_speed_from_video(
        video_path=video_path,
        checkpoint_path=checkpoint_path,
        device='cuda',  # or 'cpu'
        show_progress=True
    )
    
    # Save results
    save_speeds_to_file(speeds, output_path='video_speeds.txt')
    
    # Print sample results
    print(f"\nSample predictions:")
    for i in range(min(20, len(speeds))):
        if speeds[i] == -1:
            print(f"Frame {i:3d}: Not enough context (-1)")
        else:
            print(f"Frame {i:3d}: {speeds[i]:.4f} m/s")
