import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { serviceManager } from "./src/server/serviceManager";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure media storage and generated images directories exist
  const IMAGES_DIR = path.join(process.cwd(), "data", "generated_images");
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const MEDIA_DIR = path.join(process.cwd(), "data", "media");
  if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
  }
  const METADATA_FILE = path.join(MEDIA_DIR, "metadata.json");

  // JSON middleware
  app.use(express.json({ limit: "50mb" }));

  // CORS Middleware for local API proxy
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Ollama-Endpoint, X-ComfyUI-Endpoint, X-Target-URL, X-Target-API-Key, X-Target-Org-Id, X-Title, HTTP-Referer");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Helper function to resolve primary and fallback target Ollama URLs
  const getOllamaTargets = (req: express.Request): { primary: string; fallback: string } => {
    const customEndpoint = req.headers["x-ollama-endpoint"] as string;
    let base = customEndpoint && customEndpoint.trim() ? customEndpoint.trim().replace(/\/$/, "") : "http://127.0.0.1:11434";

    if (base.includes("localhost")) {
      const primary = base.replace("://localhost", "://127.0.0.1");
      return { primary, fallback: base };
    } else if (base.includes("127.0.0.1")) {
      const fallback = base.replace("://127.0.0.1", "://localhost");
      return { primary: base, fallback };
    }

    return { primary: base, fallback: base };
  };

  // Health check endpoint for Express backend
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "ollama-chat-proxy" });
  });

  // Proxy endpoint for Ollama API
  app.all("/api/ollama/*", async (req, res) => {
    const { primary, fallback } = getOllamaTargets(req);
    const subPath = req.params[0] || "";

    const headers: Record<string, string> = {
      "Content-Type": req.headers["content-type"] || "application/json",
    };

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(req.method.toUpperCase()) && req.body) {
      fetchOptions.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    let response: Response | null = null;
    let lastError: any = null;

    // Try primary target first
    try {
      response = await fetch(`${primary}/api/${subPath}`, fetchOptions);
    } catch (err: any) {
      lastError = err;
      // If primary failed and fallback is different, try fallback
      if (fallback !== primary) {
        try {
          response = await fetch(`${fallback}/api/${subPath}`, fetchOptions);
        } catch (err2: any) {
          lastError = err2;
        }
      }
    }

    if (response) {
      // Copy status
      res.status(response.status);

      // Copy relevant headers
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      // Stream or send text
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        const text = await response.text();
        res.send(text);
      }
    } else {
      const errorMsg = lastError?.message || "Connection failed";
      const isRefused = errorMsg.includes("ECONNREFUSED") || errorMsg.includes("fetch failed");

      res.status(502).json({
        error: isRefused
          ? `Local Ollama server is not reachable at ${primary}. Please make sure 'ollama serve' is running.`
          : `Failed to connect to Ollama: ${errorMsg}`,
        code: isRefused ? "OLLAMA_NOT_RUNNING" : "CONNECTION_ERROR",
        details: errorMsg,
        hint: "Ensure local Ollama is running (`ollama serve`) or check endpoint settings.",
      });
    }
  });

  // Proxy endpoint for generic providers (OpenAI-compatible, OpenRouter, vLLM, LM Studio)
  app.all("/api/provider-proxy", async (req, res) => {
    const targetUrl = req.headers["x-target-url"] as string;
    const targetApiKey = req.headers["x-target-api-key"] as string;
    const targetOrgId = req.headers["x-target-org-id"] as string;

    if (!targetUrl) {
      res.status(400).json({ error: "Missing x-target-url header" });
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": req.headers["content-type"] || "application/json",
    };

    if (targetApiKey) {
      headers["Authorization"] = targetApiKey.startsWith("Bearer ") ? targetApiKey : `Bearer ${targetApiKey}`;
    }

    if (targetOrgId) {
      headers["OpenAI-Organization"] = targetOrgId;
    }

    if (req.headers["http-referer"]) {
      headers["HTTP-Referer"] = req.headers["http-referer"] as string;
    }
    if (req.headers["x-title"]) {
      headers["X-Title"] = req.headers["x-title"] as string;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(req.method.toUpperCase()) && req.body) {
      fetchOptions.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    try {
      const response = await fetch(targetUrl, fetchOptions);
      res.status(response.status);

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        const text = await response.text();
        res.send(text);
      }
    } catch (err: any) {
      res.status(502).json({
        error: `Failed to connect to provider endpoint at ${targetUrl}: ${err.message}`,
        details: err.message,
      });
    }
  });

  // Helper function to resolve ComfyUI target URLs
  const getComfyTargets = (req: express.Request): { primary: string; fallback: string } => {
    const customEndpoint = req.headers["x-comfyui-endpoint"] as string;
    let base = customEndpoint && customEndpoint.trim() ? customEndpoint.trim().replace(/\/$/, "") : "http://127.0.0.1:8188";

    if (base.includes("localhost")) {
      const primary = base.replace("://localhost", "://127.0.0.1");
      return { primary, fallback: base };
    } else if (base.includes("127.0.0.1")) {
      const fallback = base.replace("://127.0.0.1", "://localhost");
      return { primary: base, fallback };
    }

    return { primary: base, fallback: base };
  };

  // Proxy endpoint for ComfyUI API
  app.all("/api/comfyui/*", async (req, res) => {
    const { primary, fallback } = getComfyTargets(req);
    const subPath = req.params[0] || "";
    // Extract query string from original URL
    const qIndex = req.originalUrl.indexOf("?");
    const queryString = qIndex !== -1 ? req.originalUrl.slice(qIndex) : "";

    const headers: Record<string, string> = {};
    const reqContentType = req.headers["content-type"] as string;
    if (reqContentType) {
      headers["Content-Type"] = reqContentType;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(req.method.toUpperCase())) {
      if (reqContentType && reqContentType.includes("multipart/form-data")) {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        fetchOptions.body = Buffer.concat(chunks);
        (fetchOptions as any).duplex = "half";
      } else if (req.body) {
        fetchOptions.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
    }

    let response: Response | null = null;
    let lastError: any = null;

    try {
      response = await fetch(`${primary}/${subPath}${queryString}`, fetchOptions);
    } catch (err: any) {
      lastError = err;
      if (fallback !== primary) {
        try {
          response = await fetch(`${fallback}/${subPath}${queryString}`, fetchOptions);
        } catch (err2: any) {
          lastError = err2;
        }
      }
    }

    if (response) {
      res.status(response.status);
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        const text = await response.text();
        res.send(text);
      }
    } else {
      const errorMsg = lastError?.message || "Connection failed";
      res.status(502).json({
        error: `ComfyUI service is not reachable at ${primary}. Please ensure ComfyUI is running on port 8188.`,
        code: "COMFYUI_NOT_RUNNING",
        details: errorMsg,
      });
    }
  });

  // Service Management Endpoints
  app.get("/api/services/status", async (req, res) => {
    const customOllama = req.headers["x-ollama-endpoint"] as string;
    const customComfy = req.headers["x-comfyui-endpoint"] as string;

    if (customOllama) serviceManager.ollamaUrl = customOllama.replace(/\/$/, "");
    if (customComfy) serviceManager.comfyUrl = customComfy.replace(/\/$/, "");

    const ollama = await serviceManager.getOllamaStatus();
    const comfyui = await serviceManager.getComfyStatus();
    res.json({ ollama, comfyui });
  });

  app.post("/api/services/ollama/start", async (_req, res) => {
    const result = await serviceManager.startOllama();
    res.json(result);
  });

  app.post("/api/services/ollama/stop", async (_req, res) => {
    const result = await serviceManager.stopOllama();
    res.json(result);
  });

  app.post("/api/services/comfyui/start", async (_req, res) => {
    const result = await serviceManager.startComfy();
    res.json(result);
  });

  app.post("/api/services/comfyui/stop", async (_req, res) => {
    const result = await serviceManager.stopComfy();
    res.json(result);
  });

  // Persistent Media & Image Storage Endpoints (Dedicated 'data/media' directory)
  app.post("/api/media", async (req, res) => {
    try {
      const { dataUrl, filename, metadata } = req.body;
      if (!dataUrl || typeof dataUrl !== "string") {
        res.status(400).json({ error: "Missing or invalid dataUrl" });
        return;
      }

      const match = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: "Invalid base64 data format" });
        return;
      }

      const ext = match[1].includes("jpeg") || match[1].includes("jpg") ? "jpg" : "png";
      const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(MEDIA_DIR, mediaId);
      const buffer = Buffer.from(match[2], "base64");

      fs.writeFileSync(filePath, buffer);

      // Persist metadata if supplied
      if (metadata && typeof metadata === "object") {
        let metaStore: Record<string, any> = {};
        try {
          if (fs.existsSync(METADATA_FILE)) {
            metaStore = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
          }
        } catch {}
        metaStore[mediaId] = {
          ...metadata,
          id: mediaId,
          filename: filename || mediaId,
          createdAt: Date.now(),
        };
        fs.writeFileSync(METADATA_FILE, JSON.stringify(metaStore, null, 2), "utf-8");
      }

      res.json({
        id: mediaId,
        url: `/api/media/${mediaId}`,
        filename: filename || mediaId,
        metadata: metadata || null,
      });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to save media: ${err.message}` });
    }
  });

  app.get("/api/media/:id", (req, res) => {
    const safeFilename = path.basename(req.params.id);
    let filePath = path.join(MEDIA_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      // Fallback check in IMAGES_DIR
      filePath = path.join(IMAGES_DIR, safeFilename);
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ error: "Media not found" });
    }
  });

  app.get("/api/media-metadata", (_req, res) => {
    try {
      if (fs.existsSync(METADATA_FILE)) {
        const metaStore = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
        res.json(metaStore);
      } else {
        res.json({});
      }
    } catch {
      res.json({});
    }
  });

  // Persistent Generated Image Storage Endpoints (Backward Compatibility)
  app.post("/api/generated-images", async (req, res) => {
    try {
      const { dataUrl, filename } = req.body;
      if (!dataUrl || typeof dataUrl !== "string") {
        res.status(400).json({ error: "Missing or invalid dataUrl" });
        return;
      }

      const match = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: "Invalid base64 data format" });
        return;
      }

      const ext = match[1].includes("jpeg") || match[1].includes("jpg") ? "jpg" : "png";
      const imageId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(IMAGES_DIR, imageId);
      const buffer = Buffer.from(match[2], "base64");

      fs.writeFileSync(filePath, buffer);
      res.json({
        id: imageId,
        url: `/api/generated-images/${imageId}`,
        filename: filename || imageId,
      });
    } catch (err: any) {
      res.status(500).json({ error: `Failed to save image: ${err.message}` });
    }
  });

  app.get("/api/generated-images/:id", (req, res) => {
    const safeFilename = path.basename(req.params.id);
    let filePath = path.join(IMAGES_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      filePath = path.join(MEDIA_DIR, safeFilename);
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  });

  // Setup Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  // Start listening on IPv6 dual-stack (which accepts both IPv6 and IPv4) with fallback
  const HOST = process.env.HOST || "::";

  const server = app.listen(PORT, HOST, () => {
    console.log(`Ollama Chat server running on [${HOST}]:${PORT} (supporting IPv4 and IPv6)`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRNOTAVAIL" || err.code === "EAFNOSUPPORT") {
      console.warn("IPv6 not available on this host, falling back to 0.0.0.0 IPv4 listener...");
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Ollama Chat server running on http://0.0.0.0:${PORT} (IPv4)`);
      });
    } else {
      console.error("Server error:", err);
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
