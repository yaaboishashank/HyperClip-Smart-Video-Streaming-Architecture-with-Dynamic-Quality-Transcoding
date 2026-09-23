import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import EmptyState from "../components/common/EmptyState";
export default function NotFound() {
  return (
    <div className="not-found">
      <EmptyState
        title="A little off the beaten path."
        message="This page doesn’t exist. Let’s find your way back."
        icon={Compass}
      >
        <Link className="button button-primary" to="/">
          Back to HyperClip
        </Link>
      </EmptyState>
    </div>
  );
}
