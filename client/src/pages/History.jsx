import { authService } from "../services/auth.service";
import { useResource } from "../hooks/useResource";
import VideoGrid from "../components/video/VideoGrid";
import Loader from "../components/common/Loader";
import { ErrorMessage } from "../components/common/Feedback";
export default function History() {
  const r = useResource("history", (signal) => authService.history(signal));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PICK UP THE THREAD</div>
          <h1>A second look.</h1>
          <p>Your 100 most recently watched videos, latest first.</p>
        </div>
      </div>
      <ErrorMessage message={r.error} retry={r.reload} />
      {r.loading ? (
        <Loader />
      ) : (
        r.data && (
          <VideoGrid
            videos={r.data}
            emptyTitle="Your watch history starts here"
            emptyMessage="Play a video and it will appear here."
          />
        )
      )}
    </>
  );
}
