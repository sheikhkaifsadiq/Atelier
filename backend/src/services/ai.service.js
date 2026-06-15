import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import { env } from "../config/env.js";

const genAI = new GoogleGenerativeAI(env.geminiApiKey);

const MODEL_NAME = "gemini-flash-lite-latest";
const SYSTEM_INSTRUCTION =
  "You are a custom, independent AI assistant. You must never mention that you are Gemini, made by Google, or powered by any specific API. You are simply 'The AI Chatbot'. Be concise, helpful, and friendly. Use Markdown when it improves readability.";

const getModel = () =>
  genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

/**
 * Convert DB messages (sender: 'user' | 'bot') into Gemini history format.
 * Gemini requires history to start with a 'user' turn and alternate.
 */
const toGeminiHistory = (messages = []) => {
  const history = messages.map((m) => ({
    role: m.sender === "bot" ? "model" : "user",
    parts: [{ text: m.content || "" }],
  }));
  // Trim leading 'model' turns
  while (history.length && history[0].role !== "user") history.shift();
  return history;
};

/**
 * Text chat with contextual memory.
 * @param {string} message Latest user message
 * @param {Array}  history Previous DB messages (oldest first)
 */
export const chatText = async (message, history = []) => {
  const model = getModel();
  const chat = model.startChat({ history: toGeminiHistory(history) });
  const result = await chat.sendMessage(message);
  return result.response.text();
};

export const MODEL_VERSION = MODEL_NAME;

export const speechToText = async (filePath, mimeType = "audio/mp3") => {
  const model = getModel();
  const audioBuffer = fs.readFileSync(filePath);
  const result = await model.generateContent([
    "Transcribe this audio precisely:",
    {
      inlineData: { mimeType, data: audioBuffer.toString("base64") },
    },
  ]);
  return result.response.text();
};

export const analyzeImage = async (filePath, prompt, mimeType = "image/jpeg") => {
  const model = getModel();
  const imageBuffer = fs.readFileSync(filePath);
  const result = await model.generateContent([
    prompt || "Describe this image in detail.",
    {
      inlineData: { mimeType, data: imageBuffer.toString("base64") },
    },
  ]);
  return result.response.text();
};
