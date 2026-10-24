import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON middleware
  app.use(express.json({ limit: "50mb" }));

  // CORS Middleware for local API proxy
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Ollama-Endpoint");
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
