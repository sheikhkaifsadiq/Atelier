import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { googleLoginUrl } from "../services/auth.service";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-md bg-accent-500/30 flex items-center justify-center text-accent-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-semibold">Welcome back</h1>
        </div>

        <a href={googleLoginUrl()} className="btn-ghost w-full border border-white/10 bg-white/5 mb-4">
          <img
            alt=""
            src="https://www.google.com/favicon.ico"
            className="w-4 h-4"
          />
          Continue with Google
        </a>

        <div className="relative my-4 text-center text-xs text-ink-400">
          <span className="bg-ink-950/0 px-2 relative z-10">or use email</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
        </div>

        <label className="block text-xs text-ink-300 mb-1">Email</label>
        <input
          className="input mb-3"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <label className="block text-xs text-ink-300 mb-1">Password</label>
        <input
          className="input mb-4"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-xs text-ink-400 mt-4 text-center">
          No account? <Link to="/signup" className="text-accent-400 hover:underline">Create one</Link>
        </p>
      </motion.form>
    </div>
  );
}
