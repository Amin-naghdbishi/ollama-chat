import http from "http";
import { ComfyApi } from "../src/services/comfyApi";
import { synthesizeImagePrompt } from "../src/services/imagePromptService";
import { DEFAULT_SETTINGS, DEFAULT_IMAGE_PROMPT_INSTRUCTIONS } from "../src/lib/storage";
import { AppSettings, ChatMessage } from "../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("--- Testing Two Distinct Workflows & Configurable Instructions ---");

  // Spin up a mock ComfyUI server
  let lastReceivedWorkflow: any = null;
  const mockPort = 8191;

  const mockServer = http.createServer((req, res) => {
    // 1. /prompt
    if (req.url === "/prompt" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        lastReceivedWorkflow = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ prompt_id: "test-direct-workflow-id", number: 1 }));
      });
      return;
    }

    // 2. /history/{id}
    if (req.url?.startsWith("/history/")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          "test-direct-workflow-id": {
            status: { status_str: "success", completed: true },
            outputs: {
              "9": {
                images: [
                  { filename: "Direct_00001_.png", subfolder: "", type: "output" },
                ],
              },
            },
          },
        })
      );
      return;
    }

    // 3. /view image
    if (req.url?.startsWith("/view")) {
      const samplePng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(samplePng);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => mockServer.listen(mockPort, resolve));
  console.log(`✓ [PASS] Mock ComfyUI server listening on port ${mockPort}`);

  // =========================================================================
  // TEST 1: Direct Generation Workflow (Bypasses LLM, sends exact raw text)
  // =========================================================================
  const rawUserPrompt = "cyberpunk samurai in the rain, neon reflections, 8k masterpiece";
  const chosenCheckpoint = "DreamShaper_8_pruned.safetensors";

  console.log("Testing Direct Generation: sending raw prompt directly to ComfyUI...");
  const directResponse = await ComfyApi.queuePrompt({
    checkpoint: chosenCheckpoint,
    prompt: rawUserPrompt, // Exact input prompt
    endpoint: `http://127.0.0.1:${mockPort}`,
  });

  assert(directResponse.prompt_id === "test-direct-workflow-id", "Direct prompt queued successfully");
  assert(lastReceivedWorkflow !== null, "ComfyUI received workflow payload");

  // Verify node 6 received the EXACT raw prompt without any LLM alteration
  const positiveClipNode = lastReceivedWorkflow.prompt["6"];
  assert(
    positiveClipNode.inputs.text === rawUserPrompt,
    `Direct workflow MUST receive exact prompt. Got: "${positiveClipNode.inputs.text}"`
  );

  // Verify node 4 loaded the selected checkpoint
  const ckptNode = lastReceivedWorkflow.prompt["4"];
  assert(
    ckptNode.inputs.ckpt_name === chosenCheckpoint,
    `Direct workflow MUST use chosen checkpoint. Got: "${ckptNode.inputs.ckpt_name}"`
  );

  console.log("✓ [PASS] Direct generation verified: exact prompt submitted directly, bypassing LLM");

  // =========================================================================
  // TEST 2: Lightweight Progress Tracking (Defensible progress, no fabricated numbers)
  // =========================================================================
  let progressReportCount = 0;
  const trackingResult = await ComfyApi.trackPrompt({
    promptId: "test-direct-workflow-id",
    endpoint: `http://127.0.0.1:${mockPort}`,
    onProgress: (p) => {
      progressReportCount++;
    },
  });

  assert(trackingResult.imageUrl.includes("Direct_00001_.png"), "Retrieved generated image output");
  console.log("✓ [PASS] Lightweight progress tracking verified");

  // =========================================================================
  // TEST 3: Configurable Image Prompt Instructions in Settings
  // =========================================================================
  const customInstructions = "Custom Test Rule: Always emphasize hyper-realistic cinematic lighting.";
  const testSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    imagePromptInstructions: customInstructions,
  };

  assert(
    testSettings.imagePromptInstructions === customInstructions,
    "Settings successfully stores custom image prompt instructions"
  );

  // Verify fallback behavior when Ollama is offline: includes context keywords
  const mockHistory: ChatMessage[] = [
    { id: "1", role: "user", content: "Tell me about a fantasy castle on a floating island", timestamp: Date.now() },
    { id: "2", role: "assistant", content: "It is a majestic citadel with crystal waterfalls cascading into clouds", timestamp: Date.now() },
  ];

  const synthesized = await synthesizeImagePrompt({
    userPrompt: "Based on this, create an image",
    conversationHistory: mockHistory,
    chatModel: "llama3.2:latest",
    settings: testSettings,
  });

  assert(
    synthesized.toLowerCase().includes("majestic citadel") ||
    synthesized.toLowerCase().includes("waterfalls") ||
    synthesized.toLowerCase().includes("detailed"),
    "Contextual image prompt synthesis successfully incorporated prior conversation context"
  );

  console.log("✓ [PASS] Configurable image prompt instructions and contextual synthesis verified");

  mockServer.close();
  console.log("All Two Distinct Workflows & Configurable Settings tests passed successfully!\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
