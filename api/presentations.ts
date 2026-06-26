import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getManifest } from "../lib/blob-store.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const presentations = await getManifest();

    return res.status(200).json({
      generated: new Date().toISOString(),
      count: presentations.length,
      presentations,
    });
  } catch (error: any) {
    console.error("Fetch error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
