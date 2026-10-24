import http from "http";
import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// 1x1 transparent PNG in base64
const SAMPLE_PNG_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function runTests() {
  console.log("--- Testing Backend Server Endpoints & Image Persistence ---");

  // Dynamically import and run server.ts or test against port 3000
  // Let's spawn or start server
  const { spawn } = await import("child_process");
  const serverProcess = spawn("node", ["dist/server.cjs"], {
    env: { ...process.env, PORT: "3001" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.on("data", (d) => {
    // console.log("[server stdout]", d.toString().trim());
  });
  serverProcess.stderr?.on("data", (d) => {
    console.error("[server stderr]", d.toString().trim());
  });

  // Wait for server to be ready
  let isReady = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await fetch("http://127.0.0.1:3000/api/health");
      if (res.ok) {
        isReady = true;
        break;
      }
    } catch {
      // Retry
    }
  }

  assert(isReady, "Server failed to start on port 3000 within timeout");
  console.log("✓ [PASS] Server started and /api/health is responding");

  try {
    // 1. Health check
    const healthRes = await fetch("http://127.0.0.1:3000/api/health");
    const healthData = await healthRes.json();
    assert(healthData.status === "ok", "Expected status: 'ok'");
    console.log("✓ [PASS] Health check verified:", healthData);

    // 2. Services Status endpoint
    const statusRes = await fetch("http://127.0.0.1:3000/api/services/status");
    assert(statusRes.ok, "Expected status endpoint to return 200");
    const statusData = await statusRes.json();
    assert(statusData.ollama && statusData.comfyui, "Status response must contain ollama and comfyui");
    console.log("✓ [PASS] /api/services/status returned valid response:", statusData);

    // 3. Service start / stop controls
    const startOllama = await (await fetch("http://127.0.0.1:3000/api/services/ollama/start", { method: "POST" })).json();
    assert(typeof startOllama.success === "boolean", "Ollama start must return success");
    console.log("✓ [PASS] POST /api/services/ollama/start response:", startOllama);

    const startComfy = await (await fetch("http://127.0.0.1:3000/api/services/comfyui/start", { method: "POST" })).json();
    assert(typeof startComfy.success === "boolean", "ComfyUI start must return success");
    console.log("✓ [PASS] POST /api/services/comfyui/start response:", startComfy);

    // 4. ComfyUI Proxy endpoint test (when offline)
    const proxyRes = await fetch("http://127.0.0.1:3000/api/comfyui/system_stats");
    assert(proxyRes.status === 502, `Expected 502 for offline ComfyUI, got ${proxyRes.status}`);
    const proxyData = await proxyRes.json();
    assert(proxyData.code === "COMFYUI_NOT_RUNNING", "Expected COMFYUI_NOT_RUNNING code");
    console.log("✓ [PASS] /api/comfyui/* proxy correctly returns 502 COMFYUI_NOT_RUNNING when offline");

    // 5. Image Persistence: upload base64 image and retrieve it
    const uploadRes = await fetch("http://127.0.0.1:3000/api/generated-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl: SAMPLE_PNG_BASE64,
        filename: "test-generated-output.png",
      }),
    });
    assert(uploadRes.ok, "Image upload must return 200");
    const uploadData = await uploadRes.json();
    assert(uploadData.id && uploadData.url, "Upload response must have id and url");
    console.log("✓ [PASS] Image uploaded and persisted to disk:", uploadData);

    // Fetch the persisted image back
    const getImageRes = await fetch(`http://127.0.0.1:3000${uploadData.url}`);
    assert(getImageRes.ok, "Image fetch must return 200");
    assert(getImageRes.headers.get("content-type") === "image/png", "Content-Type must be image/png");
    const arrayBuffer = await getImageRes.arrayBuffer();
    assert(arrayBuffer.byteLength > 0, "Persisted image must have non-zero bytes");
    console.log(`✓ [PASS] Persisted image fetched successfully (${arrayBuffer.byteLength} bytes)`);

    console.log("All Server & Image Persistence tests passed successfully!\n");
  } finally {
    serverProcess.kill("SIGTERM");
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
