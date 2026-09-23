import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/auth.service";
import { validateImage, validatePassword, mediaUrl } from "../utils/format";
import Avatar from "../components/common/Avatar";
import ThemeToggle from "../components/common/ThemeToggle";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { ErrorMessage, SuccessMessage } from "../components/common/Feedback";
export default function Settings() {
  const { user, setUser, logout, clearSession } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function account(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy("account");
    setError("");
    setSuccess("");
    try {
      setUser(
        await authService.update({
          fullName: data.get("fullName").trim(),
          email: data.get("email").trim(),
        }),
      );
      setSuccess("Account details saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }
  async function image(field, e) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = new FormData(form).get("image");
    const err = !file?.size ? "Choose an image." : validateImage(file);
    if (err) {
      setError(err);
      return;
    }
    setBusy(field);
    setError("");
    setSuccess("");
    try {
      setUser(await authService.image(field, file));
      form.reset();
      setSuccess("Profile image updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }
  async function password(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const err = validatePassword(data.get("newPassword"));
    if (err) {
      setError(err);
      return;
    }
    if (data.get("newPassword") !== data.get("confirmPassword")) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy("password");
    setError("");
    setSuccess("");
    try {
      await authService.password({
        oldPassword: data.get("oldPassword"),
        newPassword: data.get("newPassword"),
      });
      clearSession();
      navigate("/login", {
        replace: true,
        state: { message: "Password changed. Sign in with your new password." },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }
  async function signOut() {
    setBusy("logout");
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="settings-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE IT YOURS</div>
          <h1>Your account, your way.</h1>
          <p>Manage your profile and your HyperClip experience.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setError("");
            setConfirm(true);
          }}
        >
          <LogOut size={17} />
          Sign out
        </Button>
      </div>
      {!confirm && <ErrorMessage message={error} />}
      <SuccessMessage message={success} />
      <div className="settings-grid">
        <section className="panel">
          <h2>Profile details</h2>
          <div className="settings-avatar">
            <Avatar user={user} size={64} />
            <div>
              <strong>{user.fullName}</strong>
              <p className="muted">@{user.username}</p>
            </div>
          </div>
          <form className="form-stack" onSubmit={account}>
            <label>
              Full name
              <input
                name="fullName"
                defaultValue={user.fullName}
                required
                maxLength={100}
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                required
                maxLength={254}
              />
            </label>
            <Button
              type="submit"
              disabled={Boolean(busy)}
              busy={busy === "account"}
            >
              Save details
            </Button>
          </form>
        </section>
        <section className="panel">
          <h2>Appearance</h2>
          <p className="muted">Same signal. A different light.</p>
          <div className="settings-theme">
            <ThemeToggle />
          </div>
          <h3>Profile image</h3>
          <form className="form-stack" onSubmit={(e) => image("avatar", e)}>
            <label>
              New avatar
              <input
                type="file"
                name="image"
                accept=".jpg,.jpeg,.png,.webp"
                required
              />
            </label>
            <Button
              type="submit"
              variant="secondary"
              disabled={Boolean(busy)}
              busy={busy === "avatar"}
            >
              Update avatar
            </Button>
          </form>
        </section>
        <section className="panel">
          <h2>Channel cover</h2>
          {mediaUrl(user.coverImage) && (
            <img
              className="settings-cover"
              src={mediaUrl(user.coverImage)}
              alt="Current channel cover"
            />
          )}
          <form className="form-stack" onSubmit={(e) => image("coverImage", e)}>
            <label>
              New cover image
              <input
                type="file"
                name="image"
                accept=".jpg,.jpeg,.png,.webp"
                required
              />
              <small>JPG, PNG or WEBP · 5 MB max</small>
            </label>
            <Button
              type="submit"
              variant="secondary"
              disabled={Boolean(busy)}
              busy={busy === "coverImage"}
            >
              Update cover
            </Button>
          </form>
        </section>
        <section className="panel">
          <h2>Change password</h2>
          <p className="muted small">You will sign in again after saving.</p>
          <form className="form-stack" onSubmit={password}>
            <label>
              Current password
              <input
                name="oldPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <Button
              type="submit"
              variant="secondary"
              disabled={Boolean(busy)}
              busy={busy === "password"}
            >
              Change password
            </Button>
          </form>
        </section>
      </div>
      {confirm && (
        <Modal
          title="Sign out of HyperClip?"
          onClose={() => setConfirm(false)}
          busy={busy === "logout"}
        >
          <p>You can sign back in whenever you want.</p>
          <ErrorMessage message={error} />
          <div className="action-row">
            <Button onClick={signOut} busy={busy === "logout"}>
              Sign out
            </Button>
            <Button
              variant="secondary"
              disabled={busy === "logout"}
              onClick={() => setConfirm(false)}
            >
              Stay here
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
