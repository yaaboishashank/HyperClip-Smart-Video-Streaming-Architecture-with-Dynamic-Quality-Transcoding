import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { tweetService } from "../../services/tweet.service";
import { useResource } from "../../hooks/useResource";
import { date } from "../../utils/format";
import Avatar from "./Avatar";
import Button from "./Button";
import Modal from "./Modal";
import LikeButton from "./LikeButton";
import Loader from "./Loader";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";
import { ErrorMessage } from "./Feedback";
export default function CommunityPosts({ channel, own }) {
  const [page, setPage] = useState(1);
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const r = useResource(`posts:${channel._id}:${page}`, (signal) =>
    tweetService.list(channel._id, { page, limit: 10 }, signal),
  );
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await tweetService.create(content.trim());
      setContent("");
      setPage(1);
      r.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function change(e) {
    e?.preventDefault();
    const form = e ? new FormData(e.currentTarget) : null;
    setBusy(true);
    setError("");
    try {
      if (mode === "delete") await tweetService.remove(selected._id);
      else await tweetService.update(selected._id, form.get("content").trim());
      setSelected(null);
      r.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="community-feed">
      {own && (
        <form className="panel form-stack" onSubmit={create}>
          <label>
            Share a thought
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              maxLength={1000}
              placeholder="What are you creating, watching or thinking about?"
            />
          </label>
          <div className="action-row">
            <span className="muted small">{content.length}/1000</span>
            <Button type="submit" busy={busy} disabled={!content.trim()}>
              Publish post
            </Button>
          </div>
        </form>
      )}
      {!selected && <ErrorMessage message={error} />}
      <ErrorMessage message={r.error} retry={r.reload} />
      {r.loading ? (
        <Loader />
      ) : r.data?.tweets.length ? (
        r.data.tweets.map((t) => (
          <article className="panel post-card" key={t._id}>
            <div className="creator-identity">
              <Avatar user={t.owner} />
              <div>
                <strong>{t.owner?.fullName || channel.fullName}</strong>
                <p className="muted small">{date(t.createdAt)}</p>
              </div>
              {own && (
                <div className="post-tools">
                  <button
                    className="icon-button"
                    aria-label="Edit post"
                    onClick={() => {
                      setError("");
                      setSelected(t);
                      setMode("edit");
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Delete post"
                    onClick={() => {
                      setError("");
                      setSelected(t);
                      setMode("delete");
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <p className="preserve-text post-text">{t.content}</p>
            <LikeButton type="t" targetId={t._id} />
          </article>
        ))
      ) : (
        r.data && (
          <EmptyState
            title="A conversation waiting to happen"
            message="Community posts from this creator will appear here."
          />
        )
      )}
      <Pagination
        page={page}
        totalPages={r.data?.totalPages || 0}
        onChange={setPage}
      />
      {selected && (
        <Modal
          title={mode === "delete" ? "Delete post?" : "Edit post"}
          busy={busy}
          onClose={() => setSelected(null)}
        >
          {mode === "edit" ? (
            <form className="form-stack" onSubmit={change}>
              <label>
                Content
                <textarea
                  name="content"
                  defaultValue={selected.content}
                  maxLength={1000}
                  required
                />
              </label>
              <ErrorMessage message={error} />
              <Button type="submit" busy={busy}>
                Save changes
              </Button>
            </form>
          ) : (
            <>
              <p>This also removes the likes on this post.</p>
              <ErrorMessage message={error} />
              <div className="action-row">
                <Button variant="danger" busy={busy} onClick={() => change()}>
                  Delete post
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
    </div>
  );
}
