import { AlertCircle, CheckCircle2 } from "lucide-react";
import Button from "./Button";
export function ErrorMessage({ message, retry }) {
  if (!message) return null;
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      {retry && (
        <Button variant="ghost" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function SuccessMessage({ message }) {
  return message ? (
    <div className="notice notice-success" role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
