import cv2
from scipy.ndimage import gaussian_filter1d
from filterpy.kalman import KalmanFilter
import numpy as np
from scipy.signal import butter, filtfilt


def apply_butterworth_filter(speeds, fps=30.0, cutoff_hz=0.5):
    # Cutoff of 0.5Hz means changes faster than 2 seconds are smoothed out
    nyq = 0.5 * fps
    normal_cutoff = cutoff_hz / nyq
    b, a = butter(2, normal_cutoff, btype='low', analog=False)
    # filtfilt applies the filter forward and backward so it doesn't delay/lag the graph
    smoothed = filtfilt(b, a, speeds)
    return smoothed.tolist()



def apply_kalman_smoothing(speeds, process_noise=0.1, measurement_noise=1.0, apply_gaussian=False, sigma=1.0):
    kf = KalmanFilter(dim_x=1, dim_z=1)
    kf.x = np.array([speeds[0]])
    kf.F = np.array([[1.]])  # Assumes constant speed; add acceleration if needed
    kf.H = np.array([[1.]])
    kf.P *= 1.0
    kf.R = measurement_noise  # Tune: higher for noisy predictions
    kf.Q = process_noise  # Tune: lower for stable data

    smoothed = []
    for speed in speeds:
        kf.predict()
        kf.update(speed)
        smoothed.append(kf.x[0])

    if apply_gaussian:
        smoothed = gaussian_filter1d(smoothed, sigma=sigma)

    return smoothed



def preprocess(img, gamma=1.5, size=(224, 224)):
    img = cv2.convertScaleAbs(img, alpha=1.5, beta=0)
    return img


def apply_threshold_ema_smoothing(speeds, alpha=0.3, threshold=2.0):
    
    if len(speeds) < 2:
        return speeds
    
    smoothed_speeds = [speeds[0]]
    ema_speed = speeds[0]
    
    for i in range(1, len(speeds)):
        speed_change = abs(speeds[i] - smoothed_speeds[-1])
        
        if speed_change > threshold:
            # Large change - use raw speed
            smoothed_speeds.append(speeds[i])
            ema_speed = speeds[i]
        else:
            # Small change - apply EMA smoothing
            ema_speed = alpha * speeds[i] + (1 - alpha) * ema_speed
            smoothed_speeds.append(ema_speed)
    
    return smoothed_speeds


def apply_gaussian_smoothing(speeds, sigma=1.0):
    """Apply Gaussian smoothing to speed array."""
    if len(speeds) < 2:
        return speeds
    smoothed = gaussian_filter1d(speeds, sigma=sigma)
    return smoothed.tolist()


def apply_ema_gaussian_smoothing(speeds, alpha=0.3, sigma=1.0):
    """Apply EMA followed by Gaussian smoothing."""
    if len(speeds) < 2:
        return speeds
    
    # Apply EMA
    ema_speeds = []
    ema_speed = 0.0
    for speed in speeds:
        ema_speed = alpha * speed + (1 - alpha) * ema_speed
        ema_speeds.append(ema_speed)
    
    # Apply Gaussian smoothing if sigma > 0
    if sigma > 0:
        smoothed = gaussian_filter1d(ema_speeds, sigma=sigma)
        return smoothed.tolist()
    return ema_speeds


def apply_ema_smoothing(speeds, alpha=0.3):
    """Apply Exponential Moving Average (EMA) smoothing to a list of speeds."""
    if not speeds:
        return speeds
    smoothed = [speeds[0]]
    ema = speeds[0]
    for speed in speeds[1:]:
        ema = alpha * speed + (1 - alpha) * ema
        smoothed.append(ema)
    return smoothed


