import cv2
from ultralytics import YOLO


def compute_iou(box1, box2):
    """
    Compute Intersection over Union (IoU) between two bounding boxes.
    
    Args:
        box1: [x1, y1, x2, y2]
        box2: [x1, y1, x2, y2]
    
    Returns:
        IoU value (float)
    """
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    
    if x2 < x1 or y2 < y1:
        return 0.0
    
    inter_area = (x2 - x1) * (y2 - y1)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - inter_area
    
    return inter_area / union_area if union_area > 0 else 0.0


def annotate_video(input_video_path, output_video_path, model_path, class_names, conf_threshold=0.6, 
                   box_width=900, box_height=450, iou_threshold=0.03, persistence_frames=10, min_event_frames=10, enable_events=True,
                   frame_weights=None, weight_threshold=2.0):
    """
    Annotate a video with bounding boxes and labels for specified classes using a YOLO model.
    Includes event detection for dashcam footage with a front zone box, event persistence, and minimum duration filtering.
    
    Args:
        input_video_path: Path to the input .mp4 video file
        output_video_path: Path where the annotated video will be saved
        model_path: Path to the trained YOLO model weights
        class_names: List of class names corresponding to model class IDs
        conf_threshold: Confidence threshold for detections (default 0.6)
        box_width: Width of the front zone box (default 900)
        box_height: Height of the front zone box (default 450)
        iou_threshold: IoU threshold for triggering events (default 0.03)
        persistence_frames: Number of consecutive frames without event before turning off (default 10)
        min_event_frames: Minimum consecutive frames an event must be triggered to be considered valid (default 10)
        enable_events: Whether to enable event detection and triggering (default True)
        frame_weights: Optional list of float values, one per frame in the video. If provided, events are only triggered for frames where the corresponding weight > weight_threshold (default None)
        weight_threshold: Threshold for frame_weights to allow event triggering (default 2.0)
    
    Returns:
        events: List of event types (str or None) for each frame
        bboxes: List of lists of bounding boxes for each frame, each bbox is {'class': str, 'conf': float, 'bbox': [x1, y1, x2, y2]}
    """
    # Load the YOLO model
    model = YOLO(model_path)
    
    # Open the input video
    cap = cv2.VideoCapture(input_video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video {input_video_path}")
        return
    
    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"Video properties: {width}x{height}, {fps} FPS, {total_frames} frames")
    
    if frame_weights is not None and len(frame_weights) != total_frames:
        print(f"Error: frame_weights length {len(frame_weights)} does not match total frames {total_frames}")
        cap.release()
        return
    
    # Define the front zone box (centered at bottom)
    box_x1 = (width - box_width) // 2
    box_y1 = height - box_height
    box_x2 = box_x1 + box_width
    box_y2 = height
    front_box = [box_x1, box_y1, box_x2, box_y2]
    
    # Create VideoWriter for output
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')

    if output_video_path is not None:
        out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
    
    # Initialize persistence and minimum duration variables
    persistent_event = False
    persistent_event_type = None
    off_counter = 0
    consecutive_triggered = 0
    
    # Initialize lists to return
    events = []
    bboxes = []
    
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Run inference on the frame
        results = model(frame, conf=conf_threshold, verbose=False)
        
        # Initialize event detection for current frame
        event_triggered = False
        event_type = None
        current_bboxes = []
        
        # Process detections
        if results and len(results) > 0:
            boxes = results[0].boxes
            for box in boxes:
                cls = int(box.cls.item())
                conf = box.conf.item()
                xyxy = box.xyxy[0].cpu().numpy()  # Get bounding box coordinates
                
                # Only process for the chosen classes
                if 0 <= cls < len(class_names):
                    x1, y1, x2, y2 = map(int, xyxy)
                    det_box = [x1, y1, x2, y2]
                    
                    # Check IoU with front box
                    iou = compute_iou(det_box, front_box)
                    if enable_events and iou > iou_threshold and (frame_weights is None or frame_weights[frame_count] > weight_threshold):
                        event_triggered = True
                        if cls == 0:  # person
                            event_type = "Pedestrian Endangerment"
                        elif cls in [1, 2, 3, 4]:  # bicycle, car, motorcycle, bus
                            event_type = "Trailgating"
                        elif cls == 5:  # pothole
                            event_type = "Pothole Ahead"
                    
                    # Draw bounding box
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    
                    # Draw label
                    label = f"{class_names[cls]} {conf:.2f}"
                    cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                    
                    current_bboxes.append({'class': class_names[cls], 'conf': conf, 'bbox': [x1, y1, x2, y2]})
        
        # Update minimum duration and persistence
        if event_triggered:
            consecutive_triggered += 1
            if consecutive_triggered >= min_event_frames:
                persistent_event = True
                persistent_event_type = event_type
                off_counter = 0
        else:
            consecutive_triggered = 0
            off_counter += 1
            if off_counter > persistence_frames:
                persistent_event = False
                persistent_event_type = None
        
        events.append(persistent_event_type)
        bboxes.append(current_bboxes)
        
        # Draw the front zone box
        box_color = (0, 0, 255) if persistent_event else (255, 0, 0)  # Red if event, blue otherwise
        cv2.rectangle(frame, (box_x1, box_y1), (box_x2, box_y2), box_color, 2)
        
        # Draw event text if triggered
        if persistent_event and persistent_event_type:
            cv2.putText(frame, persistent_event_type, (box_x1, box_y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
        
        # Write the annotated frame to output video
        if output_video_path is not None:
            out.write(frame)
        
        frame_count += 1
        if frame_count % 100 == 0:
            print(f"Processed {frame_count}/{total_frames} frames")
    
    # Release resources
    cap.release()
    
    if output_video_path is not None:
        out.release()
    
    print(f"Annotated video saved to: {output_video_path}")
    
    return events, bboxes


if __name__ == "__main__":
        
    # Example usage:
    new_class_names = ["person", "bicycle", "car", "motorcycle", "bus", "pothole"]
    events, bboxes = annotate_video(
        input_video_path="Datasets/leftImg8bit_demoVideo/videos/stuttgart_02_demo_video.mp4",           # Path of input video
        output_video_path=None,                                                                         # Add path here to automatically save annotated video
        model_path="models\yolo11n\weights\best.pt",
        class_names=new_class_names,                                        
        conf_threshold=0.6,
        box_width=900,
        box_height=450,
        iou_threshold=0.03,
        persistence_frames=10,
        min_event_frames=10,
        frame_weights=None,                                                                             # Add speed list here to triggered events only if speed is greater than weight_threshold for a specific frame. If None enter, event will trigger regardless of speed
        weight_threshold=2.0                                                                            # Minimum speed required to trigger an event
)
    
