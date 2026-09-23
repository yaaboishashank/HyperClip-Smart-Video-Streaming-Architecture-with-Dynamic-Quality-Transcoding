import { useAuth } from "./hooks/useAuth";
import AppRoutes from "./routes/AppRoutes";
import Loader from "./components/common/Loader";
import { Brand } from "./components/layout/Header";
import ThemeToggle from "./components/common/ThemeToggle";
import { ErrorMessage } from "./components/common/Feedback";
export default function App() {
  const { loading, error, retry } = useAuth();
  if (loading || error)
    return (
      <div className="boot-screen">
        <header className="auth-header">
          <Brand />
          <ThemeToggle />
        </header>
        <main>
          {loading ? (
            <Loader label="Opening your creative space…" />
          ) : (
            <ErrorMessage message={error} retry={retry} />
          )}
        </main>
      </div>
    );
  return <AppRoutes />;
}
