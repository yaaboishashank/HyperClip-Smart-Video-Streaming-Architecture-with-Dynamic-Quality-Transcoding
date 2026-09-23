import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CloudUpload, ImagePlus } from "lucide-react";
import { videoService } from "../services/video.service";
import { validateImage, validateVideo } from "../utils/format";
import Button from "../components/common/Button";
import { ErrorMessage } from "../components/common/Feedback";

export default function Upload() {
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submitting = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(image);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    if (!busy) return;

    const guard = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", guard);

    return () => {
      window.removeEventListener("beforeunload", guard);
    };
  }, [busy]);

  async function submit(event) {
    event.preventDefault();

    if (submitting.current) return;

    const values = new FormData(event.currentTarget);
    const title = String(values.get("title") || "").trim();
    const description = String(
      values.get("description") || ""
    ).trim();

    const validationError =
      (!video ? "Choose a video." : validateVideo(video)) ||
      (!image ? "Choose a thumbnail." : validateImage(image));

    if (validationError) {
      setError(validationError);
      return;
    }

    if (
      !title ||
      title.length > 120 ||
      !description ||
      description.length > 5000
    ) {
      setError(
        "Enter a title up to 120 characters and a description up to 5000 characters."
      );
      return;
    }

    values.set("videoFile", video);
    values.set("thumbnail", image);
    values.set("title", title);
    values.set("description", description);

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      await videoService.upload(values);

      if (mounted.current) {
        navigate("/studio", {
          state: {
            message:
              "Upload saved. Your video is waiting for processing.",
          },
        });
      }
    } catch (err) {
      if (mounted.current) {
        setError(err.message || "Upload could not be completed.");
      }
    } finally {
      submitting.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  return (
    <div className="narrow-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CREATE & SHARE</div>
          <h1>Give your idea a screen.</h1>
          <p>Your next story starts here.</p>
        </div>
      </div>

      <form onSubmit={submit} className="upload-form">
        <fieldset disabled={busy}>
          <label className="upload-zone">
            <CloudUpload size={37} />
            <strong>
              {video ? video.name : "Choose your video"}
            </strong>
            <span>MP4, WEBM or MOV · Up to 100 MB</span>

            <input
              type="file"
              aria-label="Video file"
              accept=".mp4,.webm,.mov"
              required
              onChange={(event) => {
                setVideo(event.target.files[0] || null);
                setError("");
              }}
            />
          </label>

          <div className="upload-details">
            <div className="form-stack">
              <label>
                Title
                <input
                  name="title"
                  maxLength={120}
                  required
                  placeholder="A title worth clicking"
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  maxLength={5000}
                  required
                  rows={6}
                  placeholder="Tell viewers a little about your video…"
                />
              </label>
            </div>

            <label className="thumbnail-upload">
              {preview ? (
                <img src={preview} alt="Selected thumbnail" />
              ) : (
                <div>
                  <ImagePlus size={28} />
                  <strong>Choose a thumbnail</strong>
                </div>
              )}

              <input
                type="file"
                aria-label="Thumbnail"
                accept=".jpg,.jpeg,.png,.webp"
                required
                onChange={(event) => {
                  setImage(event.target.files[0] || null);
                  setError("");
                }}
              />

              <small>JPG, PNG or WEBP · 5 MB max</small>
            </label>
          </div>
        </fieldset>

        <ErrorMessage message={error} />

        {error && (
          <p className="small">
            <Link to="/studio">Check Creator Studio</Link>
            {" "}before retrying if the connection was interrupted.
          </p>
        )}

        <div className="upload-bottom">
          <p className="muted small" role="status">
            {busy
              ? "Uploading and saving your video. Keep this page open…"
              : "Your video will publish after processing. Maximum duration: 10 minutes."}
          </p>

          <Button type="submit" busy={busy} disabled={busy}>
            Upload video
          </Button>
        </div>
      </form>
    </div>
  );
}