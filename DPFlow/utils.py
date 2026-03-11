import cv2
from scipy.ndimage import gaussian_filter1d


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


