import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Menu, Play, Search, Plus } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import ThemeToggle from "../common/ThemeToggle";
import Avatar from "../common/Avatar";
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="HyperClip home">
      <span className="brand-mark">
        <Play size={19} fill="currentColor" />
      </span>
      HyperClip<span className="brand-dot">.</span>
    </Link>
  );
}
export default function Header({ onMenu }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [term, setTerm] = useState(params.get("query") || "");
  useEffect(() => {
    setTerm(location.pathname === "/" ? params.get("query") || "" : "");
  }, [location.pathname, params]);
  return (
    <header className="app-header">
      <button
        className="icon-button mobile-menu"
        aria-label="Open navigation"
        onClick={onMenu}
      >
        <Menu size={22} />
      </button>
      <Brand />
      <form
        className="header-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(
            term.trim() ? "/?query=" + encodeURIComponent(term.trim()) : "/",
          );
        }}
      >
        <Search size={18} />
        <input
          aria-label="Search videos"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          maxLength={100}
          placeholder="Search something worth watching"
        />
        <button aria-label="Submit search" type="submit">
          <span className="search-enter">↵</span>
        </button>
      </form>
      <div className="header-actions">
        <ThemeToggle />
        <Link className="button button-primary header-upload" to="/upload">
          <Plus size={17} />
          Upload
        </Link>
        <Link to="/settings" aria-label="Account settings">
          <Avatar user={user} />
        </Link>
      </div>
    </header>
  );
}
