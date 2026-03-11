import os
import tempfile
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import your inference function
# Assumes server/ and video_speed_inference.py are siblings; adjust sys.path if needed.
from video_speed_inference import predict_speed_from_video  # :contentReference[oaicite:0]{index=0}

# ---- Config ----
CHECKPOINT_PATH = os.getenv("FLEXINET_CHECKPOINT", "pretrained_models/checkpoint_epoch_390_kitti_L1_best.pth")
DEVICE = os.getenv("FLEXINET_DEVICE", None)  # e.g., "cuda" or "cpu"

# ---- App ----
app = FastAPI()

# Allow local dev from Vite/Next/etc.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173","http://127.0.0.1:5173","http://localhost:8080","http://127.0.0.1:8080","*"],  # "*" ok for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SpeedsResponse(BaseModel):
    speeds: List[float]  # mph

@app.post("/api/predict-video-speeds", response_model=SpeedsResponse)
async def predict_video_speeds(video: UploadFile = File(...)):
    # Save upload to a temp file
    suffix = os.path.splitext(video.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    try:
        # Run inference (returns speeds in m/s; first (seq_len-1) = -1) 
        speeds_ms = predict_speed_from_video(
            video_path=tmp_path,
            checkpoint_path=CHECKPOINT_PATH,
            device='cuda',
            show_progress=True,
        )


        return {"speeds": speeds_ms}
    except FileNotFoundError as e:
        # Common: missing checkpoint or bad path
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        # Common: video shorter than required sequence_length (default 13) :contentReference[oaicite:3]{index=3}
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

