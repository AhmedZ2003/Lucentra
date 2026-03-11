from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import shutil
import logging
import torch
import os
from models import get_speeds_from_video
import requests
from pydantic import BaseModel

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to specific domains here
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Directory to save uploaded videos
UPLOAD_DIR = "uploaded_videos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Path to your model weights
WEIGHTS_PATH = r"E:\FYP_2\Lucentra\DPFlow\weights\best_model_normalized_efficientNetV2_process_then_resize_2.pth"  # Update this path

class VideoRequest(BaseModel):
    videoUrl: str

@app.post("/api/analyze-video")
# async def analyze_video(video: UploadFile = File(...)):
#     try:
#         # Save the uploaded video
#         video_filename = f"{UPLOAD_DIR}/{video.filename}"
#         with open(video_filename, "wb") as buffer:
#             shutil.copyfileobj(video.file, buffer)
        
#         logger.info(f"Video uploaded: {video_filename}")
        
#         # Process the video and get speeds
#         speeds = get_speeds_from_video(video_filename, WEIGHTS_PATH)
        
#         logger.info(f"Speed data: {speeds[:5]}...")  # Log the first few speeds for review
        
#         # Return speeds as JSON response
#         return JSONResponse(content={"speeds": speeds}, status_code=200)

#     except Exception as e:
#         # Log the error details
#         logger.error(f"Error during video processing: {str(e)}")
        
#         # Return error response
#         return JSONResponse(content={"error": "Failed to process video", "details": str(e)}, status_code=500)

async def analyze_video(video_request: VideoRequest):
    try:
        video_url = video_request.videoUrl  # Get the video URL from the request
        logger.info(f"Received video URL: {video_url}")

        # Download the video from the provided URL
        video_filename = f"{UPLOAD_DIR}/{video_url.split('/')[-1]}"  # Save file with the name from URL
        with requests.get(video_url, stream=True) as video_stream:
            if video_stream.status_code == 200:
                with open(video_filename, "wb") as out_file:
                    shutil.copyfileobj(video_stream.raw, out_file)
                    logger.info(f"Video downloaded and saved: {video_filename}")
            else:
                raise HTTPException(status_code=422, detail=f"Failed to download video from {video_url}")
        
        alpha = 0.5 # 0.3 - 0.5 works well
        threshold = 2.0
        sigma = 4.5  # 4-5 gives good smoothing
        smoothing_type = "ema_gaussian"  # Choose from: "ema_threshold", "ema_gaussian", "ema", "gaussian"

        # Process the video to get speeds (replace with your processing logic)
        speeds = get_speeds_from_video(video_filename, WEIGHTS_PATH, alpha=alpha, threshold=threshold, sigma=sigma, smoothing_type=smoothing_type, use_smoothing=True)
        logger.info(f"Speed data: {speeds[:5]}...")  # Log first few speeds for review

        # Return speeds as JSON response
        return {"speeds": speeds}

    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during video processing: {str(e)}")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
