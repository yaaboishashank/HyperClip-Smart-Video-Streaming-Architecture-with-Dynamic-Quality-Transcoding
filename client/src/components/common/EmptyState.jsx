import { Video } from "lucide-react";
export default function EmptyState({
  title = "Nothing here yet",
  message,
  children,
  icon: Icon = Video,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={29} />
      </span>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
