import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";
import Typewriter from "./Typewriter";
import FeedbackButtons from "./FeedbackButtons";

export default function MessageBubble({ message, animate = false }) {
  const isUser = message.sender === "user";

  const renderBody = (text) => (
    <ReactMarkdown className="prose-chat text-ink-100">{text}</ReactMarkdown>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center shrink-0 text-accent-400">
          <Bot className="w-4 h-4" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-tr-sm px-4 py-2.5 bg-accent-500 text-white shadow-md"
              : "rounded-2xl rounded-tl-sm px-4 py-2.5 bg-white/5 border border-white/10 text-ink-100"
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : animate ? (
            <Typewriter text={message.content} render={renderBody} />
          ) : (
            renderBody(message.content)
          )}
        </div>
        {!isUser && <FeedbackButtons pipelineId={message.pipelineId} />}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center shrink-0 text-ink-200">
          <User className="w-4 h-4" />
        </div>
      )}
    </motion.div>
  );
}
