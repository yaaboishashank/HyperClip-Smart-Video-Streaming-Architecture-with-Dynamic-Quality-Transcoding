import { useState } from "react";
import { Link } from "react-router-dom";
import { ListVideo, Plus, ArrowUpRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useResource } from "../hooks/useResource";
import { playlistService } from "../services/playlist.service";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Pagination from "../components/common/Pagination";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import { ErrorMessage } from "../components/common/Feedback";
import { date } from "../utils/format";
export default function Library() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const r = useResource(`playlists:${page}`, (signal) =>
    playlistService.list(user._id, { page, limit: 12 }, signal),
  );
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await playlistService.create({
        name: form.get("name").trim(),
        description: form.get("description").trim(),
      });
      setOpen(false);
      setPage(1);
      r.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CURATED BY YOU</div>
          <h1>Your little collection.</h1>
          <p>Good things deserve a second watch.</p>
        </div>
        <Button
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          <Plus size={17} />
          New playlist
        </Button>
      </div>
      <ErrorMessage message={r.error} retry={r.reload} />
      {r.loading ? (
        <Loader />
      ) : r.data?.playlists.length ? (
        <div className="playlist-grid">
          {r.data.playlists.map((p, i) => (
            <Link
              className="playlist-card"
              to={"/playlist/" + p._id}
              key={p._id}
            >
              <div className={"playlist-art art-" + (i % 3)}>
                <ListVideo size={36} />
                <span>YOUR COLLECTION</span>
              </div>
              <div className="playlist-card-body">
                <h2>{p.name}</h2>
                <p>{p.description}</p>
                <div>
                  <span>{date(p.createdAt)}</span>
                  <ArrowUpRight size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        r.data && (
          <EmptyState
            title="Save what speaks to you"
            message="Create a playlist, then save videos from their watch page."
            icon={ListVideo}
          />
        )
      )}
      <Pagination
        page={page}
        totalPages={r.data?.totalPages || 0}
        onChange={setPage}
      />
      {open && (
        <Modal
          title="Create a playlist"
          onClose={() => setOpen(false)}
          busy={busy}
        >
          <form className="form-stack" onSubmit={create}>
            <label>
              Name
              <input
                name="name"
                required
                maxLength={100}
                placeholder="Weekend inspiration"
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                required
                maxLength={1000}
                placeholder="What belongs in this collection?"
              />
            </label>
            <p className="muted small">
              Playlists can be viewed by signed-in HyperClip users.
            </p>
            <ErrorMessage message={error} />
            <Button type="submit" busy={busy}>
              Create playlist
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
