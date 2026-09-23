import { useState } from "react";
import { commentService } from "../../services/comment.service";
import { useResource } from "../../hooks/useResource";
import Button from "../common/Button";
import Loader from "../common/Loader";
import Pagination from "../common/Pagination";
import { ErrorMessage } from "../common/Feedback";
import CommentItem from "./CommentItem";
export default function CommentList({ videoId }) {
  const [page, setPage] = useState(1);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const r = useResource(`comments:${videoId}:${page}`, (signal) =>
    commentService.list(videoId, { page, limit: 10 }, signal),
  );
  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await commentService.add(videoId, content.trim());
      setContent("");
      setPage(1);
      r.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="comments-section">
      <h2>
        Conversation{" "}
        {r.data && <span className="muted">({r.data.totalComments})</span>}
      </h2>
      <form onSubmit={add} className="comment-compose">
        <label className="sr-only" htmlFor="new-comment">
          Add a comment
        </label>
        <textarea
          id="new-comment"
          placeholder="Add something to the conversation…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          maxLength={1000}
        />
        <div className="action-row">
          <span className="muted small">{content.length}/1000</span>
          <Button busy={busy} type="submit" disabled={!content.trim()}>
            Comment
          </Button>
        </div>
      </form>
      <ErrorMessage
        message={error || r.error}
        retry={r.error ? r.reload : undefined}
      />
      {r.loading ? (
        <Loader />
      ) : (
        r.data?.comments.map((c) => (
          <CommentItem key={c._id} comment={c} onChange={r.reload} />
        ))
      )}
      {r.data?.totalComments === 0 && (
        <p className="muted">Be the first to start the conversation.</p>
      )}
      <Pagination
        page={page}
        totalPages={r.data?.totalPages || 0}
        onChange={setPage}
      />
    </section>
  );
}
