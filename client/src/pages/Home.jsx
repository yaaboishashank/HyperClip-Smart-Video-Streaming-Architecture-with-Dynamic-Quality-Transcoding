import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Play, Plus } from "lucide-react";
import { videoService } from "../services/video.service";
import { useResource } from "../hooks/useResource";
import { count, mediaUrl } from "../utils/format";
import VideoGrid from "../components/video/VideoGrid";
import Loader from "../components/common/Loader";
import Pagination from "../components/common/Pagination";
import { ErrorMessage } from "../components/common/Feedback";
export default function Home() {
  const [params, setParams] = useSearchParams();
  const term = params.get("query") || "";
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(params.get("page"), 10) || 1),
  );
  const sortBy = params.get("sort") === "views" ? "views" : "createdAt";
  const r = useResource(`home:${term}:${page}:${sortBy}`, (signal) =>
    videoService.list(
      { query: term, page, limit: 12, sortBy, sortType: "desc" },
      signal,
    ),
  );
  function update(values) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values))
      value ? next.set(key, value) : next.delete(key);
    setParams(next);
  }
  const featured = r.data?.videos[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE SIGNAL IS YOU</div>
          <h1>{term ? `Results for “${term}”` : "Find your next spark."}</h1>
          <p>Fresh perspectives. Stories worth your time.</p>
        </div>
        <Link className="button button-secondary" to="/upload">
          <Plus size={17} />
          Create something
        </Link>
      </div>
      {!term && page === 1 && (
        <section className={`home-hero ${featured ? "has-featured" : ""}`}>
          {featured && mediaUrl(featured.thumbnail) && (
            <img
              className="hero-image"
              src={mediaUrl(featured.thumbnail)}
              alt=""
            />
          )}
          <div className="hero-landscape" aria-hidden="true" />
          <div className="hero-shade" />
          <div className="hero-copy">
            <span className="eyebrow">
              {featured ? "FRESH ON HYPERCLIP" : "A SPACE FOR YOUR STORIES"}
            </span>
            <h2>
              {featured ? (
                featured.title
              ) : (
                <>
                  A little less noise.
                  <br />A little more wonder.
                </>
              )}
            </h2>
            <p>
              {featured
                ? `From ${featured.owner?.fullName || "the HyperClip community"}`
                : "Your ideas deserve a screen. Share the first one."}
            </p>
            <Link
              className="button hero-button"
              to={featured ? "/watch/" + featured._id : "/upload"}
            >
              {featured ? <Play size={17} /> : <ArrowUpRight size={17} />}{" "}
              {featured ? "Watch the story" : "Upload your first video"}
            </Link>
          </div>
          <span className="hero-edition">HYPERCLIP / DISCOVER</span>
        </section>
      )}
      <div className="section-heading">
        <h2>
          {term ? "Search results" : "Made for your curiosity"}
          {r.data && (
            <span className="count-label">{count(r.data.totalVideos)}</span>
          )}
        </h2>
        <label className="sort-label">
          <span className="sr-only">Sort videos</span>
          <select
            aria-label="Sort videos"
            value={sortBy}
            onChange={(e) => update({ sort: e.target.value, page: null })}
          >
            <option value="createdAt">Recently added</option>
            <option value="views">Most viewed</option>
          </select>
        </label>
      </div>
      <ErrorMessage message={r.error} retry={r.reload} />
      {r.loading ? (
        <Loader label="Finding your next watch…" />
      ) : (
        r.data && (
          <VideoGrid
            videos={r.data.videos}
            emptyTitle={
              term ? "No matches this time" : "The first story could be yours"
            }
            emptyMessage={
              term
                ? "Try another title or a different keyword."
                : "Upload a video to start filling your feed."
            }
          />
        )
      )}
      <Pagination
        page={page}
        totalPages={r.data?.totalPages || 0}
        onChange={(p) => update({ page: p })}
      />
    </>
  );
}
