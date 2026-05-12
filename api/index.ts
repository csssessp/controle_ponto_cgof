// Vercel Serverless Function — wraps the Express app
// All /api/* requests on Vercel are routed here via vercel.json rewrites.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server.js";

// Cache the Express app between warm invocations
let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appPromise) appPromise = createApp();
  const app = await appPromise;
  // @ts-expect-error — Express handler accepts (req, res) directly
  return app(req, res);
}
