import os
import uuid
import shutil
import tempfile
import traceback
from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from models import get_speeds_from_video_batch_process

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WEIGHTS_PATH = r"E:\FYP_2\Lucentra_Final\Backend_models\weights"
MODEL_NAME = "fastflownet"  # fastflownet or dpflow

class AnalyzeVideoRequest(BaseModel):
    videoUrl: HttpUrl


def download_video_to_temp(video_url: str) -> str:
    tmp_dir = tempfile.mkdtemp(prefix=f"{MODEL_NAME}_")
    suffix = Path(video_url).suffix or ".mp4"
    temp_path = os.path.join(tmp_dir, f"{uuid.uuid4().hex}{suffix}")

    with requests.get(video_url, stream=True, timeout=120) as response:
        response.raise_for_status()
        with open(temp_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)

    return temp_path


@app.post("/api/analyze-video")
def analyze_video(payload: AnalyzeVideoRequest):
    temp_video_path = None
    temp_dir = None

    try:
        print("Received videoUrl:", payload.videoUrl)
        print("WEIGHTS_PATH:", WEIGHTS_PATH)
        print(
            "Expected weight file:",
            os.path.join(WEIGHTS_PATH, f"{MODEL_NAME}_best.pth"),
        )

        temp_video_path = download_video_to_temp(str(payload.videoUrl))
        temp_dir = str(Path(temp_video_path).parent)

        print("Downloaded temp video:", temp_video_path)
        print("Temp video exists:", os.path.exists(temp_video_path))
        print("Temp video size:", os.path.getsize(temp_video_path))

        speeds = get_speeds_from_video_batch_process(
            video_path=temp_video_path,
            weights_path=WEIGHTS_PATH,
            model_name= MODEL_NAME,
            alpha=0.3,
            threshold=2.0,
            sigma=1.0,
            smoothing_type="butterworth",
            use_smoothing=True,
            fps=30.0,
            cutoff_hz=0.75
        )

        # normalize in case numpy floats come back
        speeds = [max(0.0, float(s)) for s in speeds]

        print("Speed data:", speeds[:5], "...")
        return {"speeds": speeds}

    except Exception as exc:
        err = traceback.format_exc()
        print("ERROR in /api/analyze-video:\n", err)
        raise HTTPException(status_code=500, detail=err)

    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)