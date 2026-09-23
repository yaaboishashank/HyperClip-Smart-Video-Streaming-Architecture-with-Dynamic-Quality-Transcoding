import { useEffect, useRef, useState } from "react";
import { authService } from "../../services/auth.service";
import { mediaUrl } from "../../utils/format";
import { ErrorMessage } from "../common/Feedback";

export default function VideoPlayer({ video, onView }) {
  return (
    <Player
      key={video._id}
      video={video}
      onView={onView}
    />
  );
}

function Player({ video, onView }) {
  const options = (video.variants || [])
    .filter((variant) => mediaUrl(variant.url))
    .slice()
    .sort((a, b) => {
      const aSize =
        Math.min(a.width || 0, a.height || 0) ||
        parseInt(a.label, 10) ||
        0;

      const bSize =
        Math.min(b.width || 0, b.height || 0) ||
        parseInt(b.label, 10) ||
        0;

      return aSize - bSize;
    });

  if (!options.length && mediaUrl(video.videoFile)) {
    options.push({
      label: "Original",
      url: video.videoFile,
    });
  }

  const [source, setSource] = useState(
    options[options.length - 1]?.url || ""
  );

  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [switching, setSwitching] = useState(false);

  const player = useRef(null);
  const resume = useRef(null);
  const recorded = useRef(false);

  useEffect(() => {
    if (!switching) return;

    const timer = setTimeout(() => {
      setSwitching(false);
      setError(
        "This quality is taking too long to load. Try another quality."
      );
    }, 20000);

    return () => clearTimeout(timer);
  }, [switching, source]);

  function changeQuality(event) {
    const nextSource = event.target.value;

    if (nextSource === source) return;

    const element = player.current;

    if (!resume.current) {
      resume.current = {
        time: element?.currentTime || 0,
        playing: element
          ? !element.paused && !element.ended
          : false,
        volume: element?.volume ?? 1,
        muted: element?.muted ?? false,
        playbackRate: element?.playbackRate ?? 1,
      };
    }

    setError("");
    setSwitching(true);
    setSource(nextSource);
  }

  function loaded() {
    const previous = resume.current;
    const element = player.current;

    if (!previous || !element) return;

    element.volume = previous.volume;
    element.muted = previous.muted;
    element.playbackRate = previous.playbackRate;

    if (Number.isFinite(element.duration)) {
      element.currentTime = Math.min(
        previous.time,
        Math.max(0, element.duration - 0.1)
      );
    }
  }

  function ready() {
    const previous = resume.current;
    resume.current = null;

    setSwitching(false);
    setError("");

    if (previous?.playing && player.current) {
      player.current.play().catch(() => {
        setError("Press play to continue.");
      });
    }
  }

  async function record() {
    if (recorded.current) return;
    recorded.current = true;

    try {
      const result = await authService.recordView(video._id);

      if (typeof result?.views === "number") {
        onView?.(result.views);
      }
    } catch {
      setHistoryError(
        "Video is playing, but watch history could not be saved."
      );
    }
  }

  if (!mediaUrl(source)) {
    return (
      <ErrorMessage message="No playable video is available." />
    );
  }

  return (
    <>
      <video
        key={source}
        ref={player}
        className="video-player"
        controls
        playsInline
        preload={switching ? "auto" : "metadata"}
        poster={mediaUrl(video.thumbnail)}
        src={mediaUrl(source)}
        onLoadedMetadata={loaded}
        onCanPlay={ready}
        onPlay={record}
        onError={() => {
          setSwitching(false);
          setError(
            "Video could not be loaded. Try another quality or refresh."
          );
        }}
      />

      <div className="action-row">
        <label>
          Quality{" "}
          <select
            aria-label="Video quality"
            value={source}
            onChange={changeQuality}
          >
            {options.map((variant) => (
              <option key={variant.url} value={variant.url}>
                {variant.label}
              </option>
            ))}
          </select>
        </label>

        {switching && (
          <span className="muted small" role="status">
            Loading selected quality…
          </span>
        )}
      </div>

      <ErrorMessage message={error} />
      <ErrorMessage message={historyError} />
    </>
  );
}