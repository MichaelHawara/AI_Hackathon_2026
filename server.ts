import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import { scrapeLinkedInProfile, normalizeLinkedInUrl } from "./linkedinScrape.ts";
import { importLinkedInViaRelevance } from "./relevanceLinkedIn.ts";
import { aggregateRemoteJobs } from "./jobsAggregator.ts";
import type { UserProfile } from "./src/types/index.ts";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "12mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/jobs", async (_req, res) => {
    try {
      const jobs = await aggregateRemoteJobs();
      res.json(jobs);
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : "Failed to load jobs",
      });
    }
  });

  function scrapeToUserProfile(
    p: Awaited<ReturnType<typeof scrapeLinkedInProfile>>,
    url: string
  ): Partial<UserProfile> {
    if (p.error || !p) {
      return { linkedInProfileUrl: url };
    }
    const out: Partial<UserProfile> = { linkedInProfileUrl: url };
    if (p.fullName) out.fullName = p.fullName;
    if (p.experience?.length) out.experience = p.experience;
    if (p.skills?.length) out.skills = p.skills;
    return out;
  }

  app.post("/api/linkedin-import", async (req, res) => {
    try {
      const raw = req.body?.profileUrl;
      if (!raw || typeof raw !== "string") {
        res.status(400).json({ error: "profileUrl is required" });
        return;
      }
      const normalized = normalizeLinkedInUrl(raw);
      if (!normalized) {
        res.status(400).json({ error: "Invalid LinkedIn profile URL" });
        return;
      }

      const relevance = await importLinkedInViaRelevance(normalized);
      if (relevance.ok === true) {
        res.json({
          ...relevance.profile,
          linkedInProfileUrl: normalized,
        });
        return;
      }
      if ("privateProfile" in relevance && relevance.privateProfile) {
        res.status(403).json({
          error: relevance.message,
          private: true,
        });
        return;
      }

      const scraped = await scrapeLinkedInProfile(normalized);
      if (scraped.error) {
        res.status(422).json({
          error: scraped.error,
          authWall: scraped.authWall,
          linkedInProfileUrl: normalized,
          relevanceError:
            "error" in relevance ? relevance.error : undefined,
        });
        return;
      }
      res.json(scrapeToUserProfile(scraped, normalized));
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : "LinkedIn import failed",
      });
    }
  });

  /** @deprecated use /api/linkedin-import */
  app.post("/api/linkedin-scrape", async (req, res) => {
    const profileUrl = req.body?.profileUrl;
    if (!profileUrl || typeof profileUrl !== "string") {
      res.status(400).json({ error: "profileUrl is required" });
      return;
    }
    try {
      const result = await scrapeLinkedInProfile(profileUrl);
      if (result.error) {
        res.status(422).json(result);
        return;
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : "Scrape failed",
      });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[dev] Port ${PORT} is already in use. Stop the other process or set PORT to a free port (e.g. PORT=3001 npm run dev).`
      );
    } else {
      console.error("[dev] HTTP server error:", err.message);
    }
    process.exit(1);
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 CareerPath AI Server running on http://localhost:${PORT}`);
  });

  // server.ts (already implemented)
const SERP_API_KEY = process.env.SERP_API_KEY;

if (SERP_API_KEY) {
  // Your app will now pull real Google Jobs!
  const response = await axios.get('https://serpapi.com/search.json', {
    params: {
      engine: "google_jobs",
      q: "software engineer intern",
      api_key: SERP_API_KEY
    }
  });
}

}

startServer();
