import VideoCard from "./VideoCard";
import EmptyState from "../common/EmptyState";
export default function VideoGrid({
  videos = [],
  emptyTitle = "No videos yet",
  emptyMessage = "New stories will appear here.",
  renderAction,
}) {
  return videos.length ? (
    <div className="video-grid">
      {videos.map((v) => (
        <VideoCard key={v._id} video={v}>
          {renderAction?.(v)}
        </VideoCard>
      ))}
    </div>
  ) : (
    <EmptyState title={emptyTitle} message={emptyMessage} />
  );
}
