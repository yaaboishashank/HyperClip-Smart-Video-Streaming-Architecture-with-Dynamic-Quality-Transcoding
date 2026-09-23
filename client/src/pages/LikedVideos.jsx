import { useState } from "react";
import { likeService } from "../services/like.service";
import { useResource } from "../hooks/useResource";
import VideoGrid from "../components/video/VideoGrid";
import Loader from "../components/common/Loader";
import Pagination from "../components/common/Pagination";
import { ErrorMessage } from "../components/common/Feedback";
export default function LikedVideos() {
  const [page, setPage] = useState(1);
  const r = useResource(`liked:${page}`, (signal) =>
    likeService.videos({ page, limit: 12 }, signal),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE ONES THAT STAY WITH YOU</div>
          <h1>Worth a like.</h1>
          <p>All the videos you have liked, in one place.</p>
        </div>
      </div>
      <ErrorMessage message={r.error} retry={r.reload} />
      {r.loading ? (
        <Loader />
      ) : (
        r.data && (
          <VideoGrid
            videos={r.data.videos}
            emptyTitle="Find something you love"
            emptyMessage="Like a video to keep it in this collection."
          />
        )
      )}
      <Pagination
        page={page}
        totalPages={r.data?.totalPages || 0}
        onChange={setPage}
      />
    </>
  );
}
