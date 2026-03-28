import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeLinkedInProfile } from "./linkedinScrape.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

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
        /** Attach HMR WebSocket to the same HTTP server (avoids a separate listener on 24678). */
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
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
}

startServer();
