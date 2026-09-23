import { Link, NavLink } from "react-router-dom";
import {
  House,
  LibraryBig,
  History,
  ThumbsUp,
  LayoutDashboard,
  Upload,
  Settings,
  Radio,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Avatar from "../common/Avatar";
const items = [
  { to: "/", label: "Home", icon: House },
  { to: "/subscriptions", label: "Subscriptions", icon: Users },
  { to: "/library", label: "My playlists", icon: LibraryBig },
  { to: "/history", label: "Watch history", icon: History },
  { to: "/liked", label: "Liked videos", icon: ThumbsUp },
];
export default function Sidebar({ open, close }) {
  const { user } = useAuth();
  return (
    <>
      <button
        className={`sidebar-scrim ${open ? "visible" : ""}`}
        aria-label="Close navigation"
        onClick={close}
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <button
          className="icon-button mobile-close"
          aria-label="Close navigation"
          onClick={close}
        >
          <X size={20} />
        </button>
        <nav aria-label="Main navigation">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              end={to === "/"}
              key={to}
              to={to}
              onClick={close}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
          <div className="nav-label">CREATE & SHARE</div>
          <NavLink to="/studio" onClick={close} className="nav-item">
            <LayoutDashboard size={19} />
            Creator studio
          </NavLink>
          <NavLink to="/upload" onClick={close} className="nav-item">
            <Upload size={19} />
            Upload video
          </NavLink>
          <NavLink
            to={"/channel/" + encodeURIComponent(user.username)}
            onClick={close}
            className="nav-item"
          >
            <Radio size={19} />
            My channel
          </NavLink>
          <div className="nav-divider" />
          <NavLink to="/settings" onClick={close} className="nav-item">
            <Settings size={19} />
            Settings
          </NavLink>
        </nav>
        <Link className="sidebar-profile" to="/settings" onClick={close}>
          <Avatar user={user} />
          <span>
            <strong>{user.fullName}</strong>
            <small>@{user.username}</small>
          </span>
        </Link>
        <span className="sidebar-signature">SIGNAL / HYPERCLIP</span>
      </aside>
    </>
  );
}
