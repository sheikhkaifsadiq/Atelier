import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { startInstance } from "./start";

/**
 * This is the server entry point for Nitro/Vercel.
 * It exports the TanStack Start handler in the WinterCG standard format.
 */
export default {
  fetch: createStartHandler(defaultStreamHandler)
};

