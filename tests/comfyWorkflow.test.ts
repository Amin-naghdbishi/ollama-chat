import http from "http";
import { ComfyApi } from "../src/services/comfyApi";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("--- Testing ComfyUI Workflow Construction & Dynamic Checkpoints ---");

  // Spin up a mock ComfyUI server to inspect outgoing requests
  let lastReceivedWorkflow: any = null;
  const mockPort = 8189;

  const mockServer = http.createServer((req, res) => {
    // 1. Checkpoint Loader Object Info
    if (req.url === "/object_info/CheckpointLoaderSimple") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          CheckpointLoaderSimple: {
            input: {
              required: {
                ckpt_name: [
                  [
                    "v1-5-pruned-emaonly.safetensors",
                    "sd_xl_base_1.0.safetensors",
                    "dreamshaper_8.safetensors",
                    "realisticVisionV60B1_v51VAE.safetensors",
                  ],
                  {},
                ],
              },
            },
          },
        })
      );
      return;
    }

    // 2. /prompt submission
    if (req.url === "/prompt" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        lastReceivedWorkflow = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ prompt_id: "test-prompt-id-12345", number: 1 }));
      });
      return;
    }

    // 3. /history/{id}
    if (req.url?.startsWith("/history/")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          "test-prompt-id-12345": {
            status: { status_str: "success", completed: true },
            outputs: {
              "9": {
                images: [
                  { filename: "OllamaChat_00001_.png", subfolder: "", type: "output" },
                ],
              },
            },
          },
        })
      );
      return;
    }

    // 4. /view image
    if (req.url?.startsWith("/view")) {
      const samplePng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(samplePng);
      return;
    }

    // 5. /interrupt
    if (req.url === "/interrupt") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => mockServer.listen(mockPort, resolve));
  console.log(`✓ [PASS] Mock ComfyUI server listening on port ${mockPort}`);

  // Test 1: Dynamic discovery of checkpoints
  const ckpts = await ComfyApi.fetchCheckpoints(`http://127.0.0.1:${mockPort}`);
  console.log("Discovered checkpoints:", ckpts);
  assert(Array.isArray(ckpts) && ckpts.length === 4, "Must discover exactly 4 checkpoints");
  assert(ckpts.includes("sd_xl_base_1.0.safetensors"), "Must contain sd_xl_base_1.0.safetensors");
  assert(ckpts.includes("dreamshaper_8.safetensors"), "Must contain dreamshaper_8.safetensors");
  console.log("✓ [PASS] Checkpoints dynamically discovered without hardcoding");

  // Test 2: Workflow submission with selected checkpoint
  const selectedCkpt = "dreamshaper_8.safetensors";
  const userPromptText = "A beautiful cybernetic owl glowing in the dark forest";

  const queueRes = await ComfyApi.queuePrompt({
    checkpoint: selectedCkpt,
    prompt: userPromptText,
    steps: 25,
    endpoint: `http://127.0.0.1:${mockPort}`,
  });

  assert(queueRes.prompt_id === "test-prompt-id-12345", "Prompt ID mismatch");
  assert(lastReceivedWorkflow !== null, "Workflow not received by server");

  const workflowPrompt = lastReceivedWorkflow.prompt;
  assert(workflowPrompt["4"], "Node 4 (CheckpointLoaderSimple) must exist");
  assert(
    workflowPrompt["4"].inputs.ckpt_name === selectedCkpt,
    `Node 4 must load selected checkpoint '${selectedCkpt}', got '${workflowPrompt["4"].inputs.ckpt_name}'`
  );
  assert(
    workflowPrompt["6"].inputs.text === userPromptText,
    "Node 6 must contain the user's enhanced prompt"
  );
  assert(workflowPrompt["3"].inputs.steps === 25, "Node 3 steps must match");
  console.log("✓ [PASS] ComfyUI workflow accurately loaded the chosen checkpoint and parameters");

  // Test 3: Concurrency protection (Semaphore)
  try {
    await ComfyApi.queuePrompt({
      checkpoint: selectedCkpt,
      prompt: "Another prompt concurrently",
      endpoint: `http://127.0.0.1:${mockPort}`,
    });
    assert(false, "Expected queuePrompt to throw when another job is in flight");
  } catch (err: any) {
    assert(
      err.message.includes("in progress"),
      `Expected error message about job in progress, got: ${err.message}`
    );
    console.log("✓ [PASS] Concurrency semaphore successfully prevented duplicate concurrent job (protecting VRAM)");
  }

  // Release lock by calling interrupt or completing
  await ComfyApi.interrupt(`http://127.0.0.1:${mockPort}`);

  // Test 4: Tracking progress and image download
  const trackResult = await ComfyApi.trackPrompt({
    promptId: "test-prompt-id-12345",
    endpoint: `http://127.0.0.1:${mockPort}`,
  });

  assert(!!trackResult.imageUrl, "Track prompt must return imageUrl");
  assert(trackResult.filename === "OllamaChat_00001_.png", "Filename mismatch");
  console.log("✓ [PASS] Prompt tracked, completed, and image URL retrieved:", trackResult);

  mockServer.close();
  console.log("All ComfyUI Workflow & Checkpoint tests passed successfully!\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
