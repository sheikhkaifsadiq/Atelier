import { chatText, speechToText, analyzeImage } from "../services/ai.service.js";
import {
  createSession,
  getSession,
  recentMessages,
  saveMessage,
  renameSession,
} from "../services/session.service.js";
import { deductCredits } from "../services/billing.service.js";
import { logInteraction } from "../services/training.service.js";

/** Ensure the requested session exists & belongs to user, or create one. */
const resolveSession = async (req) => {
  let sessionId = req.body.sessionId;
  if (sessionId) {
    const s = await getSession(sessionId, req.user.userId);
    if (!s) {
      const err = new Error("Session not found");
      err.status = 404;
      throw err;
    }
    return s;
  }
  return createSession(req.user.userId);
};

const finalize = async ({ req, res, session, prompt, response, mediaType }) => {
  // Persist messages
  await saveMessage(session.id, "user", prompt, mediaType);
  await saveMessage(session.id, "bot", response, "text");

  // Auto-title brand-new sessions
  if (session.title === "New chat") {
    const title = prompt.replace(/\s+/g, " ").trim().slice(0, 60) || "New chat";
    await renameSession(session.id, req.user.userId, title);
    session.title = title;
  }

  // Deduct credits
  const newBalance = await deductCredits(req.user.userId, req.creditCost || 0);

  // RLHF logging (don't await — fire and forget)
  const pipelinePromise = logInteraction({
    userId: req.user.userId,
    sessionId: session.id,
    prompt,
    response,
    mediaType,
  });

  // We still await so we can return the id, but errors are swallowed inside.
  const pipelineId = await pipelinePromise;

  res.json({
    sessionId: session.id,
    sessionTitle: session.title,
    reply: response,
    credits: newBalance,
    pipelineId,
  });
};

export const sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || message.length > 8000) {
      return res.status(400).json({ message: "Invalid message" });
    }
    const session = await resolveSession(req);
    const history = await recentMessages(session.id, 10);
    const response = await chatText(message, history);
    await finalize({ req, res, session, prompt: message, response, mediaType: "text" });
  } catch (err) {
    next(err);
  }
};

export const sendAudio = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Audio file required" });
    const session = await resolveSession(req);
    const mime = req.file.mimetype || "audio/mp3";
    const transcript = await speechToText(req.file.path, mime);
    const history = await recentMessages(session.id, 10);
    const response = await chatText(transcript, history);
    const prompt = `[Audio transcript] ${transcript}`;
    await finalize({ req, res, session, prompt, response, mediaType: "audio" });
  } catch (err) {
    next(err);
  }
};

export const sendImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image file required" });
    const session = await resolveSession(req);
    const userPrompt = req.body.message || "Describe this image in detail.";
    const mime = req.file.mimetype || "image/jpeg";
    const response = await analyzeImage(req.file.path, userPrompt, mime);
    const prompt = `[Image] ${userPrompt}`;
    await finalize({ req, res, session, prompt, response, mediaType: "image" });
  } catch (err) {
    next(err);
  }
};
