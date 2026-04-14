import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("vastria_token");
    if (token) {
      api
        .get("/auth/me")
        .then((res) => setUser(res.data.data))
        .catch(() => localStorage.removeItem("vastria_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("vastria_token", res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data;
  };

  const signup = async (name, email, password) => {
    const res = await api.post("/auth/signup", { name, email, password });
    localStorage.setItem("vastria_token", res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data;
  };

  const googleLogin = async (credential) => {
    const res = await api.post("/auth/google", { credential });
    localStorage.setItem("vastria_token", res.data.data.token);
    setUser(res.data.data.user);
  };

  const logout = () => {
    localStorage.removeItem("vastria_token");
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, signup, googleLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
