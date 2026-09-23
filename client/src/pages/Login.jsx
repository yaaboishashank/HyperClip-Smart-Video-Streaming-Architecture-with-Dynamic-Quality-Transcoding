import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Brand } from "../components/layout/Header";
import ThemeToggle from "../components/common/ThemeToggle";
import Button from "../components/common/Button";
import { ErrorMessage, SuccessMessage } from "../components/common/Feedback";
export function AuthFrame({ children }) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="auth-layout">
        <section className="auth-art">
          <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>
            Less scrolling.
            <br />
            More <em>sparks.</em>
          </h1>
          <p>
            A home for curious minds, fresh perspectives and the things you love
            to create.
          </p>
          <div className="auth-art-landscape" aria-hidden="true">
            <div className="art-sun" />
            <div className="art-mountain mountain-one" />
            <div className="art-mountain mountain-two" />
            <span className="art-caption">FIND YOUR PERSPECTIVE ↗</span>
          </div>
          <span className="auth-art-footer">WATCH. CREATE. CONNECT.</span>
        </section>
        <section className="auth-form-wrap">{children}</section>
      </main>
      <footer className="auth-footer">
        HyperClip <span>Made for your curiosity.</span>
      </footer>
    </div>
  );
}
export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const from =
    typeof location.state?.from === "string" &&
    location.state.from.startsWith("/") &&
    !location.state.from.startsWith("//")
      ? location.state.from
      : "/";
  if (user) return <Navigate to={from} replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const identifier = data.get("identifier").trim();
    try {
      await login({
        [identifier.includes("@") ? "email" : "username"]: identifier,
        password: data.get("password"),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame>
      <div className="eyebrow accent">WELCOME BACK</div>
      <h2>Your space awaits.</h2>
      <p className="muted">
        Sign in to watch, save and share your next favorite.
      </p>
      <SuccessMessage message={location.state?.message} />
      <form onSubmit={submit} className="form-stack">
        <label>
          Email or username
          <input
            name="identifier"
            autoComplete="username"
            required
            placeholder="you@example.com"
            maxLength={254}
          />
        </label>
        <label>
          Password
          <div className="password-field">
            <input
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Your password"
            />
            <button
              type="button"
              className="icon-button"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <ErrorMessage message={error} />
        <Button type="submit" busy={busy} className="full-width">
          Sign in
          <ArrowUpRight size={18} />
        </Button>
      </form>
      <p className="auth-switch">
        New around here? <Link to="/register">Create an account</Link>
      </p>
    </AuthFrame>
  );
}
