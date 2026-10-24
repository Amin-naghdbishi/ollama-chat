import { serviceManager } from "../src/server/serviceManager";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("--- Testing Service Manager & Safe Controls ---");

  // 1. Check initial Ollama status
  const ollamaStatus = await serviceManager.getOllamaStatus();
  console.log(`Ollama Status: ${ollamaStatus.state} (url: ${ollamaStatus.url})`);
  assert(
    ["Running", "Stopped", "Starting", "Error"].includes(ollamaStatus.state),
    `Invalid Ollama state: ${ollamaStatus.state}`
  );
  console.log("✓ [PASS] Ollama status reported valid state");

  // 2. Check initial ComfyUI status
  const comfyStatus = await serviceManager.getComfyStatus();
  console.log(`ComfyUI Status: ${comfyStatus.state} (url: ${comfyStatus.url})`);
  assert(
    ["Running", "Stopped", "Starting", "Error"].includes(comfyStatus.state),
    `Invalid ComfyUI state: ${comfyStatus.state}`
  );
  console.log("✓ [PASS] ComfyUI status reported valid state");

  // 3. Test starting Ollama when not running or binary lookup
  console.log("Testing Ollama start safe execution...");
  const startOllamaRes = await serviceManager.startOllama();
  console.log("Ollama start result:", startOllamaRes);
  assert(typeof startOllamaRes.success === "boolean", "Ollama start result must have success boolean");
  assert(typeof startOllamaRes.state === "string", "Ollama start result must report state");
  if (!startOllamaRes.success) {
    assert(!!startOllamaRes.message, "Ollama start failure must provide descriptive concise message");
    console.log(`✓ [PASS] Ollama start safely handled environment condition: "${startOllamaRes.message}"`);
  } else {
    console.log("✓ [PASS] Ollama started or already running");
  }

  // 4. Test starting ComfyUI when not installed/running
  console.log("Testing ComfyUI start safe execution...");
  const startComfyRes = await serviceManager.startComfy();
  console.log("ComfyUI start result:", startComfyRes);
  assert(typeof startComfyRes.success === "boolean", "ComfyUI start result must have success boolean");
  assert(typeof startComfyRes.state === "string", "ComfyUI start result must report state");
  if (!startComfyRes.success) {
    assert(!!startComfyRes.message, "ComfyUI start failure must provide descriptive concise message");
    console.log(`✓ [PASS] ComfyUI start safely handled environment condition: "${startComfyRes.message}"`);
  } else {
    console.log("✓ [PASS] ComfyUI started or already running");
  }

  // 5. Test stopping services safely
  console.log("Testing stop service handling...");
  const stopOllamaRes = await serviceManager.stopOllama();
  console.log("Ollama stop result:", stopOllamaRes);
  assert(typeof stopOllamaRes.success === "boolean", "Ollama stop must report success boolean");

  const stopComfyRes = await serviceManager.stopComfy();
  console.log("ComfyUI stop result:", stopComfyRes);
  assert(typeof stopComfyRes.success === "boolean", "ComfyUI stop must report success boolean");

  console.log("✓ [PASS] Stop handlers verified");
  console.log("All Service Manager tests passed successfully!\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
