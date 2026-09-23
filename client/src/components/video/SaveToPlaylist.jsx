import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useResource } from "../../hooks/useResource";
import { playlistService } from "../../services/playlist.service";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Loader from "../common/Loader";
import Pagination from "../common/Pagination";
import { ErrorMessage, SuccessMessage } from "../common/Feedback";
export default function SaveToPlaylist({ videoId, onClose }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const r = useResource(`save:${page}`, (signal) =>
    playlistService.list(user._id, { page, limit: 10 }, signal),
  );
  async function add(playlist) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await playlistService.addVideo(playlist._id, videoId);
      setSuccess("Saved to " + playlist.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function create(e) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const playlist = await playlistService.create({
        name: values.get("name").trim(),
        description: values.get("description").trim(),
      });
      r.reload();
      try {
        await playlistService.addVideo(playlist._id, videoId);
        setSuccess("Playlist created and video saved.");
      } catch (err) {
        setError("Playlist created, but video was not saved. " + err.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Save to a playlist" onClose={onClose} busy={busy}>
      <ErrorMessage message={error || r.error} />
      <SuccessMessage message={success} />
      {r.loading ? (
        <Loader />
      ) : (
        <div className="playlist-choices">
          {r.data?.playlists.map((p) => (
            <Button
              key={p._id}
              variant="secondary"
              disabled={busy}
              onClick={() => add(p)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        totalPages={r.data?.totalPages || 0}
        onChange={setPage}
      />
      <form className="form-stack" onSubmit={create}>
        <h3>Or make a new playlist</h3>
        <label>
          Name
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Description
          <input name="description" required maxLength={1000} />
        </label>
        <Button busy={busy} type="submit">
          Create & save video
        </Button>
      </form>
    </Modal>
  );
}
