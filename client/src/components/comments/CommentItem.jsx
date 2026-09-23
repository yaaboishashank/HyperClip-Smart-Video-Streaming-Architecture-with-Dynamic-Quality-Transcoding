import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { commentService } from "../../services/comment.service";
import { userId, date } from "../../utils/format";
import Avatar from "../common/Avatar";
import Button from "../common/Button";
import Modal from "../common/Modal";
import LikeButton from "../common/LikeButton";
import { ErrorMessage } from "../common/Feedback";
export default function CommentItem({ comment, onChange }) {
  const { user } = useAuth();
  const own = userId(comment.owner) === user._id;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [text, setText] = useState(comment.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await commentService.update(comment._id, text.trim());
      setEditing(false);
      onChange();
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
      await commentService.remove(comment._id);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="comment">
      <Avatar user={comment.owner} />
      <div className="comment-body">
        <div className="comment-heading">
          {comment.owner?.username ? (
            <Link to={"/channel/" + encodeURIComponent(comment.owner.username)}>
              @{comment.owner.username}
            </Link>
          ) : (
            <strong>Creator</strong>
          )}
          <span>{date(comment.createdAt)}</span>
        </div>
        {editing ? (
          <form onSubmit={save}>
            <textarea
              aria-label="Edit comment"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              required
            />
            <div className="action-row">
              <Button type="submit" busy={busy} disabled={!text.trim()}>
                Save
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <p className="preserve-text">{comment.content}</p>
        )}
        <div className="comment-actions">
          <LikeButton type="c" targetId={comment._id} />
          {own && (
            <>
              <button
                className="icon-button"
                aria-label="Edit comment"
                onClick={() => setEditing(true)}
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Delete comment"
                onClick={() => {
                  setError("");
                  setDeleting(true);
                }}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
        {!deleting && <ErrorMessage message={error} />}
      </div>
      {deleting && (
        <Modal
          title="Delete comment?"
          onClose={() => setDeleting(false)}
          busy={busy}
        >
          <p>This will also remove likes on this comment.</p>
          <ErrorMessage message={error} />
          <div className="action-row">
            <Button variant="danger" busy={busy} onClick={remove}>
              Delete comment
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </article>
  );
}
