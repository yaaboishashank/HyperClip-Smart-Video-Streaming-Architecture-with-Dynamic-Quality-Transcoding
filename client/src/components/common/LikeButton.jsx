import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { likeService } from "../../services/like.service";
import Button from "./Button";
import { ErrorMessage } from "./Feedback";
export default function LikeButton({ type, targetId }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    setBusy(true);
    setError("");
    try {
      setState(await likeService.toggle(type, targetId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  // Existing API exposes toggle, but no read-only comment/post like state.
  return (
    <div>
      <Button
        variant="secondary"
        className={state?.isLiked ? "is-liked" : ""}
        aria-pressed={state ? state.isLiked : undefined}
        busy={busy}
        onClick={toggle}
      >
        <ThumbsUp size={16} />
        {state ? (state.isLiked ? "Liked" : "Like") : "Like / unlike"}
        {state && <span>{state.likesCount}</span>}
      </Button>
      <ErrorMessage message={error} />
    </div>
  );
}
