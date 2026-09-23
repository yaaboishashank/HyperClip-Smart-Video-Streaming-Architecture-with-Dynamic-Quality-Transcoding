import { createContext, useCallback, useEffect, useState } from "react";
import { authService } from "../services/auth.service";
import { resetSessionRequests } from "../services/api";
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const clearSession = useCallback(() => {
    resetSessionRequests();
    setUser(null);
  }, []);
  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUser(await authService.me());
    } catch (err) {
      if (err.status === 401) setUser(null);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadSession();
    const expire = () => clearSession();
    window.addEventListener("hyperclip:session-expired", expire);
    return () =>
      window.removeEventListener("hyperclip:session-expired", expire);
  }, [loadSession, clearSession]);
  async function login(values) {
    const data = await authService.login(values);
    resetSessionRequests();
    setUser(data.user);
    setError("");
    return data.user;
  }
  async function logout() {
    try {
      await authService.logout();
    } catch (err) {
      if (err.status !== 401) throw err;
    }
    clearSession();
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        error,
        login,
        logout,
        clearSession,
        retry: loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
