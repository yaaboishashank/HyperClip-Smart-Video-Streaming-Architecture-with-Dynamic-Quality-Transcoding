import { useState } from "react";
import { mediaUrl } from "../../utils/format";
export default function Avatar({ user, size = 36 }) {
  const [failed, setFailed] = useState("");
  const url = mediaUrl(user?.avatar);
  const initials = (user?.fullName || user?.username || "HC")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="avatar"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {url && failed !== url ? (
        <img src={url} alt="" onError={() => setFailed(url)} />
      ) : (
        initials
      )}
    </span>
  );
}
