import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, Play, ListVideo } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useResource } from "../hooks/useResource";
import { playlistService } from "../services/playlist.service";
import { userId } from "../utils/format";
import VideoGrid from "../components/video/VideoGrid";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Loader from "../components/common/Loader";
import { ErrorMessage } from "../components/common/Feedback";
export default function Playlist() {
  const { playlistId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const r = useResource(`playlist:${playlistId}`, (signal) =>
    playlistService.get(playlistId, signal),
  );
  const p = r.data;
  const own = p && userId(p.owner) === user._id;
  async function action(fn, close = false) {
    setBusy(true);
    setError("");
    try {
      await fn();
      if (close) setModal("");
      r.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function edit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    action(
      () =>
        playlistService.update(playlistId, {
          name: data.get("name").trim(),
          description: data.get("description").trim(),
        }),
      true,
    );
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await playlistService.remove(playlistId);
      navigate("/library", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  if (r.loading) return <Loader />;
  if (r.error) return <ErrorMessage message={r.error} retry={r.reload} />;
  return (
    <>
      <div className="collection-banner">
        <div className="collection-symbol">
          <ListVideo size={44} />
        </div>
        <div>
          <div className="eyebrow">
            PLAYLIST · {p.videos.length} AVAILABLE VIDEOS
          </div>
          <h1>{p.name}</h1>
          <p className="preserve-text">{p.description}</p>
          {p.owner?.username && (
            <Link
              to={"/channel/" + encodeURIComponent(p.owner.username)}
              className="muted"
            >
              By {p.owner.fullName}
            </Link>
          )}
        </div>
      </div>
      <div className="section-heading">
        <div className="action-row">
          {p.videos[0] && (
            <Link
              className="button button-primary"
              to={"/watch/" + p.videos[0]._id}
            >
              <Play size={17} />
              Start watching
            </Link>
          )}
        </div>
        {own && (
          <div className="action-row">
            <Button
              variant="secondary"
              onClick={() => {
                setError("");
                setModal("edit");
              }}
            >
              <Pencil size={16} />
              Edit
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setError("");
                setModal("delete");
              }}
            >
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        )}
      </div>
      {!modal && <ErrorMessage message={error} />}
      <VideoGrid
        videos={p.videos}
        emptyTitle="A collection in the making"
        emptyMessage="Open a video and choose Save to add it to this playlist."
        renderAction={
          own
            ? (video) => (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    action(() =>
                      playlistService.removeVideo(playlistId, video._id),
                    )
                  }
                >
                  Remove from playlist
                </Button>
              )
            : undefined
        }
      />
      {modal && (
        <Modal
          title={modal === "edit" ? "Edit playlist" : "Delete playlist?"}
          onClose={() => setModal("")}
          busy={busy}
        >
          {modal === "edit" ? (
            <form className="form-stack" onSubmit={edit}>
              <label>
                Name
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={p.name}
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  required
                  maxLength={1000}
                  defaultValue={p.description}
                />
              </label>
              <ErrorMessage message={error} />
              <Button type="submit" busy={busy}>
                Save changes
              </Button>
            </form>
          ) : (
            <>
              <p>
                Your videos stay on HyperClip. Only this playlist is removed.
              </p>
              <ErrorMessage message={error} />
              <div className="action-row">
                <Button variant="danger" busy={busy} onClick={remove}>
                  Delete playlist
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setModal("")}
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
