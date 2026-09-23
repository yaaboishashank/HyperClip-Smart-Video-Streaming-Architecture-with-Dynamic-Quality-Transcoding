export const count = (value = 0) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
export const duration = (value = 0) => {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return n >= 3600
    ? `${Math.floor(n / 3600)}:${String(Math.floor((n % 3600) / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`
    : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};
export const date = (value) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "";
export const userId = (owner) =>
  typeof owner === "string" ? owner : owner?._id;
export const mediaUrl = (value) => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};
export function validateImage(file) {
  if (!file) return "";
  return !/\.(jpe?g|png|webp)$/i.test(file.name)
    ? "Choose a JPG, PNG or WEBP image."
    : file.size > 5 * 1024 * 1024
      ? "Each image must be 5 MB or smaller."
      : "";
}
export function validateVideo(file) {
  return !file
    ? "Choose a video."
    : !/\.(mp4|webm|mov)$/i.test(file.name)
      ? "Choose an MP4, WEBM or MOV video."
      : file.size > 100000000
        ? "Video must be 100 MB or smaller."
        : "";
}
export function validatePassword(value) {
  return value.trim().length < 8 || new TextEncoder().encode(value).length > 72
    ? "Password needs at least 8 non-padding characters and at most 72 bytes."
    : "";
}
