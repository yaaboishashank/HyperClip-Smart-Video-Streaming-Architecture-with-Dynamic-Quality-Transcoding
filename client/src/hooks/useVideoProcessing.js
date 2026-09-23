import { useEffect, useRef, useState } from "react";
import { videoService } from "../services/video.service";

export function useVideoProcessing(video, onSettled) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  const callback = useRef(onSettled);
  callback.current = onSettled;

  const active = [
    "pending",
    "processing",
    "failed",
  ].includes(video.processingStatus);

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    let timer;

    setData(null);

    async function poll() {
      try {
        const result = await videoService.status(
          video._id,
          controller.signal
        );

        if (controller.signal.aborted) return;

        setData(result);
        setError("");

        if (
          ["pending", "processing"].includes(
            result.processingStatus
          )
        ) {
          timer = setTimeout(poll, 3000);
        } else {
          callback.current?.(result);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(err.message);

        if (![401, 403, 404].includes(err.status)) {
          timer = setTimeout(poll, 5000);
        }
      }
    }

    poll();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [video._id, active, version]);

  async function retry() {
    setBusy(true);
    setError("");

    try {
      const result = await videoService.retry(video._id);
      setData(result);
      setVersion((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return {
    status: data || video,
    error,
    busy,
    retry,
  };
}