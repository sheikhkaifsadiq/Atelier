import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { signupRequest, googleLoginUrl } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signupRequest(form);
      await login(form.email, form.password);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.message || "Sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
          <h1 className="text-xl font-semibold">Create your account</h1>
        </div>

        <a href={googleLoginUrl()} className="btn-ghost w-full border border-white/10 bg-white/5 mb-4">
          <img alt="" src="https://www.google.com/favicon.ico" className="w-4 h-4" />
          Continue with Google
        </a>

        <div className="relative my-4 text-center text-xs text-ink-400">
          <span className="px-2 relative z-10">or use email</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
        </div>

        <label className="block text-xs text-ink-300 mb-1">Email</label>
        <input className="input mb-3" type="email" required value={form.email} onChange={set("email")} />
        <label className="block text-xs text-ink-300 mb-1">Username</label>
        <input className="input mb-3" required value={form.username} onChange={set("username")} />
        <label className="block text-xs text-ink-300 mb-1">Password</label>
        <input className="input mb-4" type="password" required minLength={8} value={form.password} onChange={set("password")} />

        {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="text-xs text-ink-400 mt-4 text-center">
          Already have one? <Link to="/login" className="text-accent-400 hover:underline">Sign in</Link>
        </p>
      </motion.form>
    </div>
  );
}
