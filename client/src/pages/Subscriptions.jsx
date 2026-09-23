import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowUpRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useResource } from "../hooks/useResource";
import { subscriptionService } from "../services/subscription.service";
import Avatar from "../components/common/Avatar";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import Pagination from "../components/common/Pagination";
import { ErrorMessage } from "../components/common/Feedback";
export default function Subscriptions() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const r = useResource(`subscriptions:${page}`, (signal) =>
    subscriptionService.channels(user._id, { page, limit: 12 }, signal),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR PEOPLE, YOUR PERSPECTIVES</div>
          <h1>Stay in the loop.</h1>
          <p>Visit the creators you subscribe to.</p>
        </div>
      </div>
      <ErrorMessage message={r.error} retry={r.reload} />
      {r.loading ? (
        <Loader />
      ) : r.data?.channels.length ? (
        <div className="channel-grid">
          {r.data.channels.map((c) => (
            <Link
              className="channel-card"
              key={c._id}
              to={"/channel/" + encodeURIComponent(c.username)}
            >
              <Avatar user={c} size={64} />
              <h2>{c.fullName}</h2>
              <span className="muted">@{c.username}</span>
              <span className="button button-secondary">
                Visit channel
                <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        r.data && (
          <EmptyState
            title="Make yourself a circle"
            message="Subscribe from a watch page or channel to see creators here."
            icon={Users}
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
