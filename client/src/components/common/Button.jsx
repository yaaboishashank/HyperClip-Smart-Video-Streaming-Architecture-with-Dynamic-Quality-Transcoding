import { LoaderCircle } from "lucide-react";
export default function Button({
  children,
  busy = false,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`button button-${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}
