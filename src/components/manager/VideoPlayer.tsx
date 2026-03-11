import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

type SpeedPoint = { time: number; speed: number };

const VideoPlayer = ({
  videoUrl,
  speedData,
  videoFile,
}: {
  videoUrl: string;
  speedData: SpeedPoint[];
  videoFile: File | null;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);

  // keep latest data in a ref
  const dataRef = useRef<SpeedPoint[]>(speedData);
  useEffect(() => {
    dataRef.current = speedData;
  }, [speedData]);

  // scale: (len-1)/duration, recompute on metadata or data change
  const scaleRef = useRef<number>(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || speedData.length === 0) return;

    const computeScale = () => {
      const duration = v.duration || 0.000001;
      scaleRef.current = (dataRef.current.length - 1) / duration;
    };

    if (Number.isFinite(v.duration) && v.duration > 0) {
      computeScale();
    } else {
      v.addEventListener("loadedmetadata", computeScale, { once: true });
    }
  }, [speedData.length]);

  // precise per-frame updater
  useEffect(() => {
    const v = videoRef.current;
    if (!v || speedData.length === 0) return;

    let rvfcId: number | null = null;
    let rafId: number | null = null;
    let lastIdx = -1;

    const updateAtTime = (t: number) => {
      const arr = dataRef.current;
      if (!arr.length) return;
      const idx = Math.min(
        Math.max(0, Math.round(t * scaleRef.current)),
        arr.length - 1
      );
      if (idx !== lastIdx) {
        lastIdx = idx;
        setCurrentSpeed(Math.max(0, arr[idx].speed));
      }
    };

    const hasRVFC = "requestVideoFrameCallback" in HTMLVideoElement.prototype;

    if (hasRVFC) {
      const loop = (_now: number, meta: any) => {
        updateAtTime(meta.mediaTime);
        rvfcId = (v as any).requestVideoFrameCallback(loop);
      };
      rvfcId = (v as any).requestVideoFrameCallback(loop);
    } else {
      const loop = () => {
        updateAtTime(v.currentTime || 0);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    const onEnded = () => {
      const arr = dataRef.current;
      if (arr.length) setCurrentSpeed(Math.max(0, arr[arr.length - 1].speed));
    };
    v.addEventListener("ended", onEnded);

    return () => {
      v.removeEventListener("ended", onEnded);
      if (rvfcId != null && (v as any).cancelVideoFrameCallback) {
        (v as any).cancelVideoFrameCallback(rvfcId);
      }
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [speedData]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.pause();
    else v.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-card-foreground flex items-center gap-2">
          Journey Playback
        </CardTitle>
        <CardDescription>
          Visualize your driving journey with real-time speed overlay
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full rounded-lg"
            playsInline
            onLoadedData={() => console.log("Video loaded successfully")}
            onError={(e) => console.error("Error loading video:", e)}
          />
          {/* Overlay pill */}
          <div className="absolute top-4 left-4 bg-background/80 text-foreground px-3 py-1 rounded-md text-sm shadow-md">
            Speed: {currentSpeed.toFixed(2)} ms
          </div>
          {/* Optional custom play/pause button */}
          <Button
            onClick={togglePlay}
            className="absolute bottom-4 right-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;
