import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Mic, Image as ImageIcon, ArrowRight } from "lucide-react";

const features = [
  { icon: MessageSquare, title: "Conversational memory", text: "Picks up where you left off across every chat." },
  { icon: ImageIcon, title: "Image understanding", text: "Drop in a photo and ask anything about it." },
  { icon: Mic, title: "Audio transcription", text: "Upload audio and chat with the transcript." },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent-500/30 flex items-center justify-center text-accent-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold">AI Chatbot</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost">Sign in</Link>
          <Link to="/signup" className="btn-primary">Get started</Link>
        </div>
      </header>

      <section className="flex-1 max-w-6xl mx-auto w-full px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-ink-300 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-accent-400" /> Now with persistent memory & RLHF training pipeline
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
            Your enterprise-grade AI assistant,<br />
            <span className="text-accent-400">with a memory.</span>
          </h1>
          <p className="text-ink-300 mt-6 max-w-xl mx-auto">
            Chat with text, image, and audio. Pick up old conversations, rate responses,
            and watch your assistant get smarter.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/signup" className="btn-primary">
              Start chatting <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-ghost">I have an account</Link>
          </div>
        </motion.div>

        <div className="mt-20 grid sm:grid-cols-3 gap-4 text-left">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="glass rounded-2xl p-5"
            >
              <f.icon className="w-5 h-5 text-accent-400 mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-ink-300">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
