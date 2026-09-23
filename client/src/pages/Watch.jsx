import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookmarkPlus } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../hooks/useAuth";
import { videoService } from "../services/video.service";
import { authService } from "../services/auth.service";
import { subscriptionService } from "../services/subscription.service";
import { count, date, userId } from "../utils/format";

import { ErrorMessage } from "../components/common/Feedback";
import { useVideoProcessing } from "../hooks/useVideoProcessing";


import VideoPlayer from "../components/video/VideoPlayer";
import VideoCard from "../components/video/VideoCard";
import SaveToPlaylist from "../components/video/SaveToPlaylist";
import CommentList from "../components/comments/CommentList";
import Avatar from "../components/common/Avatar";
import Button from "../components/common/Button";
import LikeButton from "../components/common/LikeButton";
import Loader from "../components/common/Loader";






function WatchContent({ video }) {
  const { user } = useAuth();
  const [views, setViews] = useState(video.views);
  const [save, setSave] = useState(false);
  const [sub, setSub] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const owner = video.owner;
  const own = userId(owner) === user._id;
  const channel = useResource(`watch-channel:${owner?.username}`, (signal) =>
    owner?.username
      ? authService.channel(owner.username, signal)
      : Promise.resolve(null),
  );
  const recommendations = useResource(`related:${video._id}`, (signal) =>
    videoService.list({ limit: 6 }, signal),
  );
  const isSubscribed = sub?.isSubscribed ?? channel.data?.isSubscribed ?? false;
  async function subscribe() {
    setBusy(true);
    setError("");
    try {
      const result = await subscriptionService.toggle(userId(owner));
      setSub(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="watch-layout">
      <div className="watch-main">
        <VideoPlayer key={video._id} video={video} onView={setViews} />
        <h1 className="watch-title">{video.title}</h1>
        <div className="watch-actions">
          <div className="creator-identity">
            <Avatar user={owner} size={42} />
            <div>
              {owner?.username ? (
                <Link
                  className="strong"
                  to={"/channel/" + encodeURIComponent(owner.username)}
                >
                  {owner.fullName}
                </Link>
              ) : (
                <strong>Creator unavailable</strong>
              )}
              <p className="muted small">
                {channel.data
                  ? `${count(sub?.subscribersCount ?? channel.data.subscribersCount)} subscribers`
                  : "HyperClip creator"}
              </p>
            </div>
            {own ? (
              <Link className="button button-secondary" to="/studio">
                Manage
              </Link>
            ) : (
              owner && (
                <Button
                  variant={isSubscribed ? "secondary" : "primary"}
                  busy={busy}
                  disabled={channel.loading || Boolean(channel.error)}
                  onClick={subscribe}
                >
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Button>
              )
            )}
          </div>
          <div className="action-row">
            <LikeButton key={video._id} type="v" targetId={video._id} />
            <Button variant="secondary" onClick={() => setSave(true)}>
              <BookmarkPlus size={17} />
              Save
            </Button>
          </div>
        </div>
        <ErrorMessage
          message={error || channel.error}
          retry={channel.error ? channel.reload : undefined}
        />
        <div className="video-description">
          <div className="small strong">
            {count(views)} views · {date(video.createdAt)}
            {video.isPublished === false && " · Unpublished"}
          </div>
          <p className="preserve-text">{video.description}</p>
        </div>
        <CommentList key={video._id} videoId={video._id} />
      </div>
      <aside className="watch-next">
        <h2>Keep your curiosity going</h2>
        {recommendations.loading ? (
          <Loader />
        ) : (
          recommendations.data?.videos
            .filter((v) => v._id !== video._id)
            .map((v) => <VideoCard key={v._id} video={v} />)
        )}
        <ErrorMessage
          message={recommendations.error}
          retry={recommendations.reload}
        />
      </aside>
      {save && (
        <SaveToPlaylist videoId={video._id} onClose={() => setSave(false)} />
      )}
    </div>
  );
}

function ProcessingWatch({ video, onReady }) {
  const job = useVideoProcessing(video, (result) => {
    if (result.processingStatus === "ready") {
      onReady();
    }
  });

  const failed =
    job.status.processingStatus === "failed";

  return (
    <section className="panel form-stack">
      <h1>{video.title}</h1>

      <p>
        {job.status.processingStage ||
          "Waiting for worker"}
      </p>

      {failed ? (
        <>
          <ErrorMessage
            message={job.status.processingError}
          />

          <Button
            busy={job.busy}
            onClick={job.retry}
          >
            Retry processing
          </Button>
        </>
      ) : (
        <p className="muted">
          Your video will become available after processing.
          You can leave this page.
        </p>
      )}

      <ErrorMessage message={job.error} />

      <Link
        to="/studio"
        className="button button-secondary"
      >
        Back to Studio
      </Link>
    </section>
  );
}

export default function Watch() {
  const { videoId } = useParams();

  const r = useResource(
    `watch:${videoId}`,
    (signal) => videoService.get(videoId, signal)
  );

  if (r.loading) {
    return <Loader label="Loading your video…" />;
  }

  if (r.error) {
    return (
      <ErrorMessage
        message={r.error}
        retry={r.reload}
      />
    );
  }

  if (
    r.data.processingStatus &&
    r.data.processingStatus !== "ready"
  ) {
    return (
      <ProcessingWatch
        key={videoId}
        video={r.data}
        onReady={r.reload}
      />
    );
  }

  return (
    <WatchContent
      key={videoId}
      video={r.data}
    />
  );
}
