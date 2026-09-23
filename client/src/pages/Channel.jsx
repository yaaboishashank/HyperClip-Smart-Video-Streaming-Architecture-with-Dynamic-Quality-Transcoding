import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useResource } from "../hooks/useResource";
import { authService } from "../services/auth.service";
import { videoService } from "../services/video.service";
import { subscriptionService } from "../services/subscription.service";
import { count, mediaUrl } from "../utils/format";
import Avatar from "../components/common/Avatar";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import Pagination from "../components/common/Pagination";
import VideoGrid from "../components/video/VideoGrid";
import CommunityPosts from "../components/common/CommunityPosts";
import { ErrorMessage } from "../components/common/Feedback";
function ChannelContent({ initial }) {
  const { user } = useAuth();
  const [channel, setChannel] = useState(initial);
  const [tab, setTab] = useState("videos");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const own = user._id === channel._id;
  const r = useResource(`channel-videos:${channel._id}:${page}`, (signal) =>
    videoService.list({ userId: channel._id, page, limit: 12 }, signal),
  );
  async function subscribe() {
    setBusy(true);
    setError("");
    try {
      const data = await subscriptionService.toggle(channel._id);
      setChannel((c) => ({ ...c, ...data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="channel-cover">
        {mediaUrl(channel.coverImage) ? (
          <img src={mediaUrl(channel.coverImage)} alt="Channel cover" />
        ) : (
          <div className="channel-cover-art">
            <span>
              EVERY PERSPECTIVE
              <br />
              HAS A PLACE.
            </span>
          </div>
        )}
      </div>
      <div className="channel-intro">
        <Avatar user={channel} size={86} />
        <div>
          <h1>{channel.fullName}</h1>
          <p className="muted">
            @{channel.username} · {count(channel.subscribersCount)} subscribers
          </p>
        </div>
        {own ? (
          <Link className="button button-secondary" to="/settings">
            Edit channel
          </Link>
        ) : (
          <Button
            variant={channel.isSubscribed ? "secondary" : "primary"}
            busy={busy}
            onClick={subscribe}
          >
            {channel.isSubscribed ? "Subscribed" : "Subscribe"}
          </Button>
        )}
      </div>
      <ErrorMessage message={error} />
      <div className="tabs" aria-label="Channel sections">
        <button
          className={tab === "videos" ? "active" : ""}
          onClick={() => setTab("videos")}
        >
          Videos
        </button>
        <button
          className={tab === "community" ? "active" : ""}
          onClick={() => setTab("community")}
        >
          Community
        </button>
      </div>
      {tab === "videos" ? (
        <>
          <ErrorMessage message={r.error} retry={r.reload} />
          {r.loading ? (
            <Loader />
          ) : (
            r.data && (
              <VideoGrid
                videos={r.data.videos}
                emptyTitle="Stories are on their way"
                emptyMessage="Videos from this creator will appear here."
              />
            )
          )}
          <Pagination
            page={page}
            totalPages={r.data?.totalPages || 0}
            onChange={setPage}
          />
        </>
      ) : (
        <CommunityPosts channel={channel} own={own} />
      )}
    </>
  );
}
export default function Channel() {
  const { username } = useParams();
  const r = useResource(`channel:${username}`, (signal) =>
    authService.channel(username, signal),
  );
  return r.loading ? (
    <Loader />
  ) : r.error ? (
    <ErrorMessage message={r.error} retry={r.reload} />
  ) : (
    <ChannelContent key={username} initial={r.data} />
  );
}
