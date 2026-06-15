import { chatText } from "./src/services/ai.service.js";

async function test() {
  try {
    console.log("Sending 'hi' to Gemini...");
    const reply = await chatText("hi");
    console.log("REPLY:", reply);
    console.log("TYPE:", typeof reply);
    console.log("LENGTH:", reply ? reply.length : 0);
  } catch (err) {
    console.error("ERROR:", err);
  }
}
test();
