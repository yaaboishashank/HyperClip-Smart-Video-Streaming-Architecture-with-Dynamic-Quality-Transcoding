import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authService } from "../services/auth.service";
import { validateImage, validatePassword } from "../utils/format";
import { useAuth } from "../hooks/useAuth";
import { AuthFrame } from "./Login";
import Button from "../components/common/Button";
import { ErrorMessage } from "../components/common/Feedback";
export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (user) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const avatar = form.get("avatar");
    const cover = form.get("coverImage");
    const error = !avatar?.size
      ? "Choose a profile image."
      : validateImage(avatar) ||
        (cover?.size ? validateImage(cover) : "") ||
        validatePassword(form.get("password"));
    if (error) {
      setError(error);
      return;
    }
    if (!cover?.size) form.delete("coverImage");
    for (const key of ["fullName", "username", "email"])
      form.set(key, form.get(key).trim());
    setBusy(true);
    setError("");
    try {
      await authService.register(form);
      navigate("/login", {
        replace: true,
        state: { message: "Account created. Sign in to get started." },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame>
      <div className="eyebrow accent">MAKE YOURSELF AT HOME</div>
      <h2>Start your story.</h2>
      <p className="muted">Create your HyperClip account.</p>
      <form onSubmit={submit} className="form-stack">
        <div className="form-columns">
          <label>
            Full name
            <input
              name="fullName"
              autoComplete="name"
              required
              maxLength={100}
              placeholder="Shashank Sharma"
            />
          </label>
          <label>
            Username
            <input
              name="username"
              autoComplete="username"
              required
              maxLength={50}
              placeholder="shashank"
            />
          </label>
        </div>
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="shashank@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </label>
        <div className="form-columns">
          <label>
            Profile image
            <input
              type="file"
              name="avatar"
              accept=".jpg,.jpeg,.png,.webp"
              required
            />
            <small>Required · JPG, PNG or WEBP · 5 MB max</small>
          </label>
          <label>
            Cover image <span className="muted">(optional)</span>
            <input
              type="file"
              name="coverImage"
              accept=".jpg,.jpeg,.png,.webp"
            />
            <small>5 MB max</small>
          </label>
        </div>
        <ErrorMessage message={error} />
        <Button type="submit" busy={busy} className="full-width">
          Create account
        </Button>
      </form>
      <p className="auth-switch">
        Already a member? <Link to="/login">Sign in</Link>
      </p>
    </AuthFrame>
  );
}
