import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loginRequest } from "../services/auth.service";
import { fetchMe } from "../services/user.service";

const AuthContext = createContext();

const decode = (token) => {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const applyToken = useCallback((accessToken, refreshToken) => {
    if (accessToken) {
      localStorage.setItem("token", accessToken);
      setToken(accessToken);
    }
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const u = await fetchMe();
      setUser(u);
    } catch {
      /* token might be stale */
    }
  }, []);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    const payload = decode(token);
    if (payload) {
      setUser((prev) => prev ?? { id: payload.userId, roles: payload.roles || [] });
      refreshMe();
    }
  }, [token, refreshMe]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await loginRequest(email, password);
      applyToken(data.accessToken, data.refreshToken);
    } finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, applyToken, refreshMe }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
