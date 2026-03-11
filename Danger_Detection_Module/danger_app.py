# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# import shutil
# import requests
# import os
# import uuid
# import traceback
# from fastapi.staticfiles import StaticFiles

# from Detect_Events import annotate_video

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# UPLOAD_DIR = "danger_uploaded_videos"
# OUTPUT_DIR = "danger_output_videos"

# os.makedirs(UPLOAD_DIR, exist_ok=True)
# os.makedirs(OUTPUT_DIR, exist_ok=True)

# app.mount("/static", StaticFiles(directory=OUTPUT_DIR), name="static")

# # Update these paths for your machine
# YOLO_MODEL_PATH = r"E:\FYP_2\Lucentra_Final\Danger_Detection_Module\models\yolo11n\weights\best.pt"
# CLASS_NAMES = ["person", "bicycle", "car", "motorcycle", "bus", "pothole"]


# class DangerVideoRequest(BaseModel):
#     videoUrl: str
#     frameWeights: list[float] | None = None


# @app.post("/api/detect-danger")
# async def detect_danger(payload: DangerVideoRequest):
#     try:
#         video_url = payload.videoUrl
#         frame_weights = payload.frameWeights

#         file_ext = video_url.split(".")[-1].split("?")[0] if "." in video_url else "mp4"
#         input_filename = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.{file_ext}")
#         output_filename = os.path.join(OUTPUT_DIR, f"{uuid.uuid4()}_annotated.mp4")

#         # download input video
#         with requests.get(video_url, stream=True) as stream:
#             if stream.status_code != 200:
#                 raise HTTPException(status_code=422, detail="Failed to download source video")
#             with open(input_filename, "wb") as f:
#                 shutil.copyfileobj(stream.raw, f)

#         events, bboxes = annotate_video(
#             input_video_path=input_filename,
#             output_video_path=output_filename,
#             model_path=YOLO_MODEL_PATH,
#             class_names=CLASS_NAMES,
#             conf_threshold=0.6,
#             box_width=900,
#             box_height=450,
#             iou_threshold=0.03,
#             persistence_frames=10,
#             min_event_frames=10,
#             frame_weights=frame_weights,
#             weight_threshold=2.0,
#         )

#         # If frontend can access local static files directly, return a public URL here.
#         # Example if you later mount OUTPUT_DIR as /static:
#         annotated_video_url = f"http://localhost:8001/static/{os.path.basename(output_filename)}"

#         return {
#             "annotatedVideoUrl": annotated_video_url,
#             "events": events,
#             "bboxes": bboxes,
#         }

#     except Exception as e:
#         print("Danger detection failed:")
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8001)


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import requests
from dotenv import load_dotenv
import os
import uuid

import cloudinary
import cloudinary.uploader
import subprocess

from Detect_Events import annotate_video
import traceback

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "danger_uploaded_videos"
OUTPUT_DIR = "danger_output_videos"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

YOLO_MODEL_PATH = r"E:\FYP_2\Lucentra_Final\Danger_Detection_Module\models\yolo11n\weights\best.pt"
CLASS_NAMES = ["person", "bicycle", "car", "motorcycle", "bus", "pothole"]

load_dotenv()

# Cloudinary config
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

class DangerVideoRequest(BaseModel):
    videoUrl: str
    frameWeights: list[float] | None = None


@app.post("/api/detect-danger")
async def detect_danger(payload: DangerVideoRequest):
    input_filename = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.mp4")
    output_filename = os.path.join(OUTPUT_DIR, f"{uuid.uuid4()}_annotated.mp4")

    try:
        video_url = payload.videoUrl
        frame_weights = payload.frameWeights

        # Download original input video temporarily
        with requests.get(video_url, stream=True) as stream:
            if stream.status_code != 200:
                raise HTTPException(status_code=422, detail="Failed to download source video")
            with open(input_filename, "wb") as f:
                shutil.copyfileobj(stream.raw, f)

        result = annotate_video(
            input_video_path=input_filename,
            output_video_path=output_filename,
            model_path=YOLO_MODEL_PATH,
            class_names=CLASS_NAMES,
            conf_threshold=0.6,
            box_width=900,
            box_height=450,
            iou_threshold=0.03,
            persistence_frames=10,
            min_event_frames=10,
            # frame_weights=frame_weights,
            frame_weights=None,
            weight_threshold=2.0,
        )

        if result is None:
            raise HTTPException(status_code=500, detail="annotate_video returned None")

        events, bboxes = result

        # def format_events_for_frontend(events):
        #     formatted = []

        #     for item in events:
        #         # If backend already returns dict-like objects
        #         if isinstance(item, dict):
        #             formatted.append({
        #                 "event": item.get("event", "Unknown Event"),
        #                 "time": float(item.get("time", 0)),
        #                 "duration": float(item.get("duration", 1.0)),
        #                 "severity": item.get("severity", "medium"),
        #             })
        #         else:
        #             # Fallback if backend returns only event names as strings
        #             formatted.append({
        #                 "event": str(item),
        #                 "time": 0.0,
        #                 "duration": 1.0,
        #                 "severity": "medium",
        #             })

        #     return formatted

        def build_event_windows(events):
            """
            Convert per-frame event labels into event windows.

            Expected input examples:
            - ["None", "Trailgating", "Trailgating", None, "Pedestrian Endangerment"]
            - [["Trailgating"], ["Trailgating", "Pedestrian Endangerment"], [], ...]
            """

            def normalize_frame_events(frame_item):
                if frame_item is None:
                    return set()

                if isinstance(frame_item, list):
                    values = frame_item
                else:
                    values = [frame_item]

                cleaned = set()
                for value in values:
                    if value is None:
                        continue
                    name = str(value).strip()
                    if not name:
                        continue
                    if name.lower() in {"none", "null", "undefined"}:
                        continue
                    cleaned.add(name)

                return cleaned

            formatted = []
            active_events = {}  # event_name -> start_frame
            total_frames = len(events)

            for frame_idx, frame_item in enumerate(events):
                current_events = normalize_frame_events(frame_item)

                # close events that disappeared on this frame
                for event_name in list(active_events.keys()):
                    if event_name not in current_events:
                        start_frame = active_events.pop(event_name)
                        duration = frame_idx - start_frame
                        if duration > 0:
                            formatted.append({
                                "event": event_name,
                                "time": start_frame,
                                "duration": duration,
                                "severity": "medium",
                            })

                # start newly appearing events
                for event_name in current_events:
                    if event_name not in active_events:
                        active_events[event_name] = frame_idx

            # close events still active at the end
            for event_name, start_frame in active_events.items():
                duration = total_frames - start_frame
                if duration > 0:
                    formatted.append({
                        "event": event_name,
                        "time": start_frame,
                        "duration": duration,
                        "severity": "medium",
                    })

            return formatted
        
        # formatted_events = format_events_for_frontend(events)
        formatted_events = build_event_windows(events)

        if not os.path.exists(output_filename):
            raise HTTPException(status_code=500, detail="Annotated video file was not created")
        
        safe_output_filename = os.path.join(OUTPUT_DIR, f"{uuid.uuid4()}_annotated_h264.mp4")

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i", output_filename,
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                safe_output_filename,
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        if not os.path.exists(safe_output_filename):
            raise HTTPException(status_code=500, detail="FFmpeg re-encoded video was not created")

        # Upload processed video to Cloudinary
        upload_result = cloudinary.uploader.upload_large(
        safe_output_filename,
        resource_type="video",
        folder="danger_detection_outputs",
        public_id=f"danger_{uuid.uuid4()}",
        overwrite=True,
        )

        annotated_video_url = upload_result["secure_url"]
        annotated_video_public_id = upload_result["public_id"]

        if not annotated_video_url or not annotated_video_public_id:
            raise HTTPException(status_code=500, detail="Cloudinary upload failed")

        return {
            "annotatedVideoUrl": annotated_video_url,
            "annotatedVideoPublicId": annotated_video_public_id,
            "events": formatted_events,
            "bboxes": bboxes,
        }

    except Exception as e:
        print("Danger detection failed:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup temp local files
        for file_path in [input_filename, output_filename]:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception:
                pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)