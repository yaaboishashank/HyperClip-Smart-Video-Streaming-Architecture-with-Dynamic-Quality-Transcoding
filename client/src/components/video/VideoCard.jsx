import { useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import Avatar from "../common/Avatar";
import { count, duration, date, mediaUrl } from "../../utils/format";
export default function VideoCard({ video, children }) {
  const [failed, setFailed] = useState(false);
  const owner = video.owner;
  return (
    <article className="video-card">
      <Link
        className="video-thumb"
        to={"/watch/" + video._id}
        aria-label={"Watch " + video.title}
      >
        {mediaUrl(video.thumbnail) && !failed ? (
          <img
            src={mediaUrl(video.thumbnail)}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="thumbnail-fallback">
            <Play size={32} />
          </span>
        )}
        <span className="video-play">
          <Play size={24} fill="currentColor" />
        </span>
        <span className="duration">{duration(video.duration)}</span>
        {video.isPublished === false && (
          <span className="video-badge">Unpublished</span>
        )}
      </Link>
      <div className="video-card-details">
        <Avatar user={owner} size={32} />
        <div>
          <Link className="video-title" to={"/watch/" + video._id}>
            {video.title}
          </Link>
          {owner?.username ? (
            <Link
              className="video-owner"
              to={"/channel/" + encodeURIComponent(owner.username)}
            >
              {owner.fullName || owner.username}
            </Link>
          ) : (
            <span className="video-owner">Creator</span>
          )}
          <p className="video-meta">
            {count(video.views)} views · {date(video.createdAt)}
          </p>
        </div>
      </div>
      {children}
    </article>
  );
}
