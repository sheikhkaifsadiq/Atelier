import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // The SDK doesn't expose a direct list models method easily in some versions, but let's try 
    // to just generate content with gemini-1.5-flash and gemini-pro to see which fails.
    console.log("Trying gemini-1.5-flash...");
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("hello");
      console.log("gemini-1.5-flash WORKS!");
    } catch(e) { console.error("gemini-1.5-flash FAILED: " + e.message); }

    console.log("Trying gemini-1.5-pro...");
    try {
      const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result2 = await model2.generateContent("hello");
      console.log("gemini-1.5-pro WORKS!");
    } catch(e) { console.error("gemini-1.5-pro FAILED: " + e.message); }

    console.log("Trying gemini-pro...");
    try {
      const model3 = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result3 = await model3.generateContent("hello");
      console.log("gemini-pro WORKS!");
    } catch(e) { console.error("gemini-pro FAILED: " + e.message); }

  } catch (err) {
    console.error(err);
  }
}
listModels();
