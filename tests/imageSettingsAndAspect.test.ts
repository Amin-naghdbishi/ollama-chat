import http from "http";
import {
  extractImageParametersFromPrompt,
  resolveImageParameters,
  getDefaultImageModelProfile,
  isSdxlCheckpoint,
  normalizeDigitsAndText,
} from "../src/services/imageSettingsService";
import { detectImageIntent } from "../src/services/imagePromptService";
import { ComfyApi } from "../src/services/comfyApi";
import { ImageModelProfile } from "../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("--- Testing Image Generation Settings, Aspect Ratios & Natural Language Parsing ---");

  // =========================================================================
  // 1. Multilingual Natural Language Extraction (English & Persian)
  // =========================================================================
  console.log("Testing English natural language settings extraction...");

  // Example 1: "Create a square image at 1024 × 1024 pixels."
  const enEx1 = "Create a square image at 1024 × 1024 pixels.";
  assert(detectImageIntent(enEx1).isImageRequest === true, "Must detect image request");
  const enExt1 = extractImageParametersFromPrompt(enEx1);
  assert(enExt1.width === 1024 && enExt1.height === 1024, `Expected 1024x1024, got ${enExt1.width}x${enExt1.height}`);
  assert(enExt1.aspectRatio === "square", `Expected square, got ${enExt1.aspectRatio}`);
  console.log("✓ [PASS] EN: 'Create a square image at 1024 × 1024 pixels.' -> 1024x1024 square");

  // Example 2: "Generate a portrait image at 1024 × 1536."
  const enEx2 = "Generate a portrait image at 1024 × 1536.";
  assert(detectImageIntent(enEx2).isImageRequest === true, "Must detect image request");
  const enExt2 = extractImageParametersFromPrompt(enEx2);
  assert(enExt2.width === 1024 && enExt2.height === 1536, `Expected 1024x1536, got ${enExt2.width}x${enExt2.height}`);
  assert(enExt2.aspectRatio === "portrait", `Expected portrait, got ${enExt2.aspectRatio}`);
  console.log("✓ [PASS] EN: 'Generate a portrait image at 1024 × 1536.' -> 1024x1536 portrait");

  // Example 3: "Make a landscape image at 1536 × 1024."
  const enEx3 = "Make a landscape image at 1536 × 1024.";
  assert(detectImageIntent(enEx3).isImageRequest === true, "Must detect image request");
  const enExt3 = extractImageParametersFromPrompt(enEx3);
  assert(enExt3.width === 1536 && enExt3.height === 1024, `Expected 1536x1024, got ${enExt3.width}x${enExt3.height}`);
  assert(enExt3.aspectRatio === "landscape", `Expected landscape, got ${enExt3.aspectRatio}`);
  console.log("✓ [PASS] EN: 'Make a landscape image at 1536 × 1024.' -> 1536x1024 landscape");

  // Example 4: "Generate this image at the highest available quality."
  const enEx4 = "Generate this image at the highest available quality.";
  assert(detectImageIntent(enEx4).isImageRequest === true, "Must detect image request");
  const enExt4 = extractImageParametersFromPrompt(enEx4);
  assert(enExt4.qualityPreset === "highest", `Expected highest quality, got ${enExt4.qualityPreset}`);
  console.log("✓ [PASS] EN: 'Generate this image at the highest available quality.' -> quality: highest");

  console.log("Testing Persian natural language settings extraction...");

  // Example 5: «یک تصویر مربعی با ابعاد ۱۰۲۴ در ۱۰۲۴ بساز.»
  const faEx1 = "یک تصویر مربعی با ابعاد ۱۰۲۴ در ۱۰۲۴ بساز.";
  assert(detectImageIntent(faEx1).isImageRequest === true, "Must detect Persian image request");
  const faExt1 = extractImageParametersFromPrompt(faEx1);
  assert(faExt1.width === 1024 && faExt1.height === 1024, `Expected 1024x1024, got ${faExt1.width}x${faExt1.height}`);
  assert(faExt1.aspectRatio === "square", `Expected square, got ${faExt1.aspectRatio}`);
  console.log("✓ [PASS] FA: 'یک تصویر مربعی با ابعاد ۱۰۲۴ در ۱۰۲۴ بساز.' -> 1024x1024 square");

  // Example 6: «یک تصویر عمودی با ابعاد ۱۰۲۴ در ۱۵۳۶ تولید کن.»
  const faEx2 = "یک تصویر عمودی با ابعاد ۱۰۲۴ در ۱۵۳۶ تولید کن.";
  assert(detectImageIntent(faEx2).isImageRequest === true, "Must detect Persian image request");
  const faExt2 = extractImageParametersFromPrompt(faEx2);
  assert(faExt2.width === 1024 && faExt2.height === 1536, `Expected 1024x1536, got ${faExt2.width}x${faExt2.height}`);
  assert(faExt2.aspectRatio === "portrait", `Expected portrait, got ${faExt2.aspectRatio}`);
  console.log("✓ [PASS] FA: 'یک تصویر عمودی با ابعاد ۱۰۲۴ در ۱۵۳۶ تولید کن.' -> 1024x1536 portrait");

  // Example 7: «تصویر را افقی و با ابعاد ۱۵۳۶ در ۱۰۲۴ بساز.»
  const faEx3 = "تصویر را افقی و با ابعاد ۱۵۳۶ در ۱۰۲۴ بساز.";
  assert(detectImageIntent(faEx3).isImageRequest === true, "Must detect Persian image request");
  const faExt3 = extractImageParametersFromPrompt(faEx3);
  assert(faExt3.width === 1536 && faExt3.height === 1024, `Expected 1536x1024, got ${faExt3.width}x${faExt3.height}`);
  assert(faExt3.aspectRatio === "landscape", `Expected landscape, got ${faExt3.aspectRatio}`);
  console.log("✓ [PASS] FA: 'تصویر را افقی و با ابعاد ۱۵۳۶ در ۱۰۲۴ بساز.' -> 1536x1024 landscape");

  // Example 8: «این تصویر را با بالاترین کیفیت ممکن تولید کن.»
  const faEx4 = "این تصویر را با بالاترین کیفیت ممکن تولید کن.";
  assert(detectImageIntent(faEx4).isImageRequest === true, "Must detect Persian image request");
  const faExt4 = extractImageParametersFromPrompt(faEx4);
  assert(faExt4.qualityPreset === "highest", `Expected highest quality, got ${faExt4.qualityPreset}`);
  console.log("✓ [PASS] FA: 'این تصویر را با بالاترین کیفیت ممکن تولید کن.' -> quality: highest");

  // =========================================================================
  // 2. Saved Defaults vs One-time Request Overrides
  // =========================================================================
  console.log("Testing saved profile defaults vs per-request one-time overrides...");

  const savedSdxlProfile: ImageModelProfile = {
    width: 1024,
    height: 1024,
    aspectRatio: "square",
    qualityPreset: "standard",
    steps: 25,
    cfg: 7.0,
  };

  // Test 2a: Request with no explicit settings uses saved profile
  const defaultReq = resolveImageParameters({
    prompt: "A beautiful enchanted castle on a hill",
    ckptName: "sd_xl_base_1.0.safetensors",
    savedProfile: savedSdxlProfile,
  });
  assert(defaultReq.width === 1024 && defaultReq.height === 1024, "Should use saved width/height");
  assert(defaultReq.aspectRatio === "square", "Should use saved aspect ratio");
  assert(defaultReq.steps === 25, "Should use saved steps");
  assert(!defaultReq.hasExplicitOverrides, "Should flag hasExplicitOverrides as false");
  console.log("✓ [PASS] Unspecified request correctly uses saved profile defaults");

  // Test 2b: Request with explicit override does NOT mutate saved profile object
  const overrideReq = resolveImageParameters({
    prompt: "Generate a portrait image at 1024 × 1536 at highest quality of an elven princess",
    ckptName: "sd_xl_base_1.0.safetensors",
    savedProfile: savedSdxlProfile,
  });
  assert(overrideReq.width === 1024 && overrideReq.height === 1536, "Override width/height should be applied");
  assert(overrideReq.aspectRatio === "portrait", "Override aspect ratio applied");
  assert(overrideReq.qualityPreset === "highest", "Override quality preset applied");
  assert(overrideReq.steps === 50, "Highest quality steps should be 50 on SDXL");
  assert(overrideReq.hasExplicitOverrides, "Should flag hasExplicitOverrides as true");

  // Crucial check: saved profile must remain unchanged
  assert(savedSdxlProfile.width === 1024 && savedSdxlProfile.height === 1024, "Saved profile width/height must not be mutated");
  assert(savedSdxlProfile.aspectRatio === "square", "Saved profile aspect ratio must not be mutated");
  assert(savedSdxlProfile.qualityPreset === "standard", "Saved profile quality must not be mutated");
  assert(savedSdxlProfile.steps === 25, "Saved profile steps must not be mutated");
  console.log("✓ [PASS] Request-specific overrides applied without mutating saved profile");

  // =========================================================================
  // 3. Hardware & Checkpoint Capabilities Graceful Handling
  // =========================================================================
  console.log("Testing hardware and checkpoint capabilities graceful handling...");

  // SDXL supports 1536x1024 natively
  const sdxlCheck = resolveImageParameters({
    prompt: "Make a landscape image at 1536 × 1024",
    ckptName: "sd_xl_base_1.0.safetensors",
  });
  assert(sdxlCheck.width === 1536 && sdxlCheck.height === 1024, "SDXL must accept 1536x1024");
  assert(!sdxlCheck.warning, "SDXL should not trigger warning for 1536x1024");
  console.log("✓ [PASS] SDXL handles 1536x1024 natively without downgrade");

  // SD 1.5 checkpoint (e.g. v1-5-pruned or dreamshaper_8) requested at 1536x1024 exceeds VRAM/latent limit
  const sd15Check = resolveImageParameters({
    prompt: "Make a landscape image at 1536 × 1024",
    ckptName: "v1-5-pruned-emaonly.safetensors",
    language: "en",
  });
  assert(sd15Check.width === 768 && sd15Check.height === 512, `SD 1.5 should fallback to 768x512, got ${sd15Check.width}x${sd15Check.height}`);
  assert(sd15Check.aspectRatio === "landscape", "Aspect ratio must be preserved during fallback");
  assert(!!sd15Check.warning && sd15Check.warning.includes("SD 1.5"), "Must provide clear limitation explanation");
  console.log("✓ [PASS] SD 1.5 gracefully handles excessive resolution with fallback & clear explanation:", sd15Check.warning);

  // =========================================================================
  // 4. Actual ComfyUI Workflow Verification with Dimensions & Quality
  // =========================================================================
  console.log("Testing ComfyUI workflow construction with custom dimensions & steps...");

  const mockPort = 8192;
  let receivedWorkflow: any = null;

  const mockServer = http.createServer((req, res) => {
    if (req.url === "/prompt" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        receivedWorkflow = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ prompt_id: "test-workflow-resolution-id", number: 1 }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => mockServer.listen(mockPort, resolve));

  await ComfyApi.queuePrompt({
    checkpoint: "sd_xl_base_1.0.safetensors",
    prompt: "cyberpunk skyline with flying cars",
    width: 1536,
    height: 1024,
    steps: 35,
    cfg: 7.5,
    endpoint: `http://127.0.0.1:${mockPort}`,
  });

  assert(receivedWorkflow !== null, "Server must receive workflow");
  const nodes = receivedWorkflow.prompt;
  assert(nodes["5"].inputs.width === 1536, `Node 5 (EmptyLatentImage) width must be 1536, got ${nodes["5"].inputs.width}`);
  assert(nodes["5"].inputs.height === 1024, `Node 5 (EmptyLatentImage) height must be 1024, got ${nodes["5"].inputs.height}`);
  assert(nodes["3"].inputs.steps === 35, `Node 3 (KSampler) steps must be 35, got ${nodes["3"].inputs.steps}`);
  assert(nodes["3"].inputs.cfg === 7.5, `Node 3 (KSampler) cfg must be 7.5, got ${nodes["3"].inputs.cfg}`);
  console.log("✓ [PASS] ComfyUI workflow correctly received configured width=1536, height=1024, steps=35");

  await new Promise<void>((resolve) => mockServer.close(() => resolve()));

  console.log("\nAll Image Generation Settings & Aspect Ratio tests passed successfully!\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
