import { useState } from "react";
import { Link } from "react-router-dom";
import { useVideoProcessing } from "../hooks/useVideoProcessing";
import {
  Eye,
  Users,
  Video,
  ThumbsUp,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { dashboardService } from "../services/dashboard.service";
import { videoService } from "../services/video.service";
import { useResource } from "../hooks/useResource";
import { count, date, mediaUrl, validateImage } from "../utils/format";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import Pagination from "../components/common/Pagination";
import EmptyState from "../components/common/EmptyState";
import { ErrorMessage, SuccessMessage } from "../components/common/Feedback";

function ProcessingBadge({ video, onChange }) {
  const job = useVideoProcessing(video, (result) => {
    if (
      result.processingStatus !== video.processingStatus
    ) {
      onChange();
    }
  });

  const state =
    job.status.processingStatus || "ready";

  return (
    <div>
      <p className="muted small">
        Processing: {state}
        {state !== "ready" &&
          ` — ${job.status.processingStage ||
          "Waiting for worker"
          }`}
      </p>

      {state === "failed" && (
        <>
          <ErrorMessage
            message={job.status.processingError}
          />

          <Button
            variant="secondary"
            busy={job.busy}
            onClick={job.retry}
          >
            Retry processing
          </Button>
        </>
      )}

      <ErrorMessage message={job.error} />
    </div>
  );
}


export default function Studio() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const stats = useResource("studio-stats", (signal) =>
    dashboardService.stats(signal),
  );
  const r = useResource(`studio:${page}`, (signal) =>
    dashboardService.videos({ page, limit: 10 }, signal),
  );
  function reload() {
    r.reload();
    stats.reload();
  }
  function choose(video, type) {
    setError("");
    setSuccess("");
    setSelected(video);
    setMode(type);
  }
  async function toggle(video) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const updated = await videoService.togglePublish(video._id);
      setSuccess(
        updated.isPublished ? "Video published." : "Video unpublished.",
      );
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const body = new FormData(e.currentTarget);
    const image = body.get("thumbnail");
    const err = image?.size ? validateImage(image) : "";
    if (err) {
      setError(err);
      return;
    }
    if (!image?.size) body.delete("thumbnail");
    body.set("title", body.get("title").trim());
    body.set("description", body.get("description").trim());
    setBusy(true);
    setError("");
    try {
      const data = await videoService.update(selected._id, body);
      setSelected(null);
      setSuccess(
        data.mediaCleanupPending
          ? "Video saved. The old thumbnail still needs server cleanup."
          : "Video updated.",
      );
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const data = await videoService.remove(selected._id);
      setSelected(null);
      setSuccess(
        data.mediaCleanupPending
          ? "Video deleted. Media cleanup needs attention on the server."
          : "Video deleted.",
      );
      if (r.data.videos.length === 1 && page > 1) setPage(page - 1);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const metrics = [
    { key: "totalViews", label: "Total views", icon: Eye },
    { key: "totalSubscribers", label: "Subscribers", icon: Users },
    { key: "totalVideos", label: "Your videos", icon: Video },
    { key: "totalLikes", label: "Video likes", icon: ThumbsUp },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR IDEAS, OUT IN THE WORLD</div>
          <h1>Your creator studio.</h1>
          <p>A home for everything you make.</p>
        </div>
        <Link className="button button-primary" to="/upload">
          <Plus size={17} />
          New video
        </Link>
      </div>
      <ErrorMessage message={stats.error} retry={stats.reload} />
      <div className="stats-grid">
        {metrics.map(({ key, label, icon: Icon }) => (
          <div className="stat-card" key={key}>
            <span>
              {label}
              <Icon size={18} />
            </span>
            <strong>
              {stats.loading ? "—" : stats.data ? count(stats.data[key]) : "—"}
            </strong>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <h2>Your uploads</h2>
        <span className="muted small">
          {stats.data ? `${stats.data.publishedVideos} published` : ""}
        </span>
      </div>
      <SuccessMessage message={success} />
      {!selected && <ErrorMessage message={error} />}
      <ErrorMessage message={r.error} retry={r.reload} />
      {r.loading ? (
        <Loader />
      ) : r.data?.videos.length ? (
        <div className="studio-list">
          {r.data.videos.map((v) => (
            <article className="studio-row" key={v._id}>
              <Link to={"/watch/" + v._id} className="studio-thumb">
                {mediaUrl(v.thumbnail) ? (
                  <img src={mediaUrl(v.thumbnail)} alt="" />
                ) : (
                  <Video size={24} />
                )}
              </Link>
              <div className="studio-info">
                <Link className="strong" to={"/watch/" + v._id}>
                  {v.title}
                </Link>
                <p className="muted small">
                  {date(v.createdAt)} · {count(v.views)} views
                </p>
                <span
                  className={
                    "status-badge " + (v.isPublished ? "published" : "")
                  }
                >
                  {v.isPublished ? "Published" : "Unpublished"}
                </span>

                <ProcessingBadge
                  video={v}
                  onChange={reload}
                />
              </div>
              <div className="studio-tools">
                <Button
                  variant="secondary"
                  disabled={
                    busy ||
                    (
                      v.processingStatus &&
                      v.processingStatus !== "ready"
                    )
                  }
                  onClick={() => toggle(v)}
                >
                  {v.isPublished ? "Unpublish" : "Publish"}
                </Button>
                <button
                  className="icon-button"
                  disabled={busy}
                  aria-label={"Edit " + v.title}
                  onClick={() => choose(v, "edit")}
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button"
                  disabled={
                    busy || v.processingStatus === "processing"
                  }
                  aria-label={"Delete " + v.title}
                  onClick={() => choose(v, "delete")}
                >
                  <Trash2 size={17} />
                </button>
                <Link
                  className="icon-button"
                  aria-label={"Watch " + v.title}
                  to={"/watch/" + v._id}
                >
                  <ExternalLink size={17} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        r.data && (
          <EmptyState
            title="Your next chapter is a video"
            message="Publish your first upload to see it in your studio."
          >
            <Link className="button button-primary" to="/upload">
              Upload a video
            </Link>
          </EmptyState>
        )
      )}
      <Pagination
        page={page}
        totalPages={r.data?.totalPages || 0}
        onChange={setPage}
      />
      {selected && (
        <Modal
          title={mode === "edit" ? "Edit video" : "Delete video?"}
          onClose={() => setSelected(null)}
          busy={busy}
        >
          {mode === "edit" ? (
            <form className="form-stack" onSubmit={save}>
              <label>
                Title
                <input
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={selected.title}
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  required
                  maxLength={5000}
                  defaultValue={selected.description}
                />
              </label>
              <label>
                Replace thumbnail <span className="muted">(optional)</span>
                <input
                  name="thumbnail"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                />
                <small>JPG, PNG or WEBP · 5 MB max</small>
              </label>
              <ErrorMessage message={error} />
              <Button type="submit" busy={busy}>
                Save changes
              </Button>
            </form>
          ) : (
            <>
              <p>
                “{selected.title}” and its comments and likes will be
                permanently removed.
              </p>
              <ErrorMessage message={error} />
              <div className="action-row">
                <Button variant="danger" busy={busy} onClick={remove}>
                  Delete video
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
