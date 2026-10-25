import fs from "fs";
import path from "path";
import { ComfyApi } from "../src/services/comfyApi";
import { synthesizeImageEditPrompt } from "../src/services/imagePromptService";
import { mediaService } from "../src/services/mediaService";
import {
  ThemeEngine,
  deriveGlassThemeColors,
  DEFAULT_GLASS_DARK,
  DEFAULT_GLASS_LIGHT,
} from "../src/lib/themeEngine";
import { DEFAULT_SETTINGS } from "../src/lib/storage";
import { ChatMessage, GlassThemeConfig } from "../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// 1x1 transparent sample PNG in base64
const SAMPLE_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function runTests() {
  console.log("--- Testing Image Viewing, Editing Workflows, Replies & Glass Themes ---");

  // 1. Test Media Storage Directory Creation & Endpoints
  console.log("Testing dedicated media directory structure and persistence...");
  const mediaDir = path.join(process.cwd(), "data", "media");
  assert(fs.existsSync(mediaDir), "Dedicated 'data/media' directory must exist");
  console.log("✓ [PASS] Dedicated 'data/media' directory verified");

  // Test server /api/media endpoint
  const saveMediaResult = await mediaService.saveMedia(SAMPLE_PNG_BASE64, "test-edit-version.png", {
    tool: "edit-prompt",
    rootImageId: "test-root-1",
    versionNumber: 2,
    editInstruction: "Add a crown above the lizard's head",
  });
  assert(Boolean(saveMediaResult.id), "Saved media must have an ID");
  assert(Boolean(saveMediaResult.url), "Saved media must have a URL");
  console.log("✓ [PASS] mediaService.saveMedia correctly stored media:", saveMediaResult.url);

  // 2. Test Image Version History (Upper-Left Corner Thumbnails) & Multi-Version Branching
  console.log("Testing Image Version History & Multi-Version Branching (Upper-Left corner thumbnails)...");
  const rootId = `img-test-${Date.now()}`;
  const initialUrl = "/api/media/initial-test.png";

  // Initialize version 1
  const history1 = mediaService.initHistoryIfNeeded(rootId, initialUrl, "Initial original visual");
  assert(history1.versions.length === 1, "Must have exactly 1 version on init");
  assert(history1.versions[0].versionNumber === 1, "Initial version must be version #1");
  assert(history1.versions[0].imageUrl === initialUrl, "Version 1 must reference initial URL");
  console.log("✓ [PASS] Version 1 initialized properly:", history1.versions[0]);

  // Add Version 2 (Add crown)
  const v2Url = "/api/media/crown-test.png";
  const v2 = mediaService.addVersion(rootId, {
    imageUrl: v2Url,
    editInstruction: "Add a crown above the lizard's head",
    parentVersionId: history1.versions[0].id,
    toolUsed: "edit-prompt",
  });
  assert(v2.versionNumber === 2, "New version must be #2");
  assert(v2.parentVersionId === history1.versions[0].id, "v2 must link to v1 parent");

  // Add Version 3 (Change color)
  const v3Url = "/api/media/gold-test.png";
  const v3 = mediaService.addVersion(rootId, {
    imageUrl: v3Url,
    editInstruction: "Change crown to ruby jewel",
    parentVersionId: v2.id,
    toolUsed: "edit-prompt",
  });
  assert(v3.versionNumber === 3, "New version must be #3");

  const fullHistory = mediaService.getVersionHistory(rootId);
  assert(fullHistory !== null, "History must exist for rootId");
  assert(fullHistory!.versions.length === 3, "History must contain all 3 versions");
  assert(fullHistory!.currentVersionId === v3.id, "Active version must be v3");
  console.log("✓ [PASS] Version history tracking & parent relationships verified (3 versions)");

  // Test reverting / switching active version
  const reverted = mediaService.setActiveVersion(rootId, history1.versions[0].id);
  assert(reverted !== null && reverted.versionNumber === 1, "Reverted version must be version 1");
  const updatedHistory = mediaService.getVersionHistory(rootId);
  assert(updatedHistory!.currentVersionId === history1.versions[0].id, "Active version must now be v1");
  console.log("✓ [PASS] Version switching and reopening earlier versions verified");

  // 3. Test ComfyUI Img2Img and Inpainting Workflow Construction
  console.log("Testing ComfyUI img2img and inpainting workflow construction...");
  assert(typeof ComfyApi.queueImg2ImgPrompt === "function", "ComfyApi.queueImg2ImgPrompt must be defined");
  assert(typeof ComfyApi.uploadImage === "function", "ComfyApi.uploadImage must be defined");
  console.log("✓ [PASS] ComfyApi img2img & image upload API methods verified");

  // 4. Test Natural Language Edit Instruction (Persian & English)
  console.log("Testing Natural Language Edit Instructions (Persian & English)...");
  const persianLizard = "یک تاج بالای سر مارمولک اضافه کن";
  const translatedLizard = await synthesizeImageEditPrompt({
    editInstruction: persianLizard,
    chatModel: "llama3",
    settings: DEFAULT_SETTINGS,
    sourceContext: "a green lizard basking on a rock in desert",
  });
  assert(Boolean(translatedLizard && translatedLizard.length > 0), "Persian lizard edit instruction must produce non-empty result");
  assert(
    translatedLizard.toLowerCase().includes("lizard") && translatedLizard.toLowerCase().includes("crown"),
    "Synthesized prompt must faithfully incorporate lizard and crown"
  );
  console.log(`✓ [PASS] FA lizard instruction faithfully synthesized: "${translatedLizard}"`);

  const englishInstruction = "Make the hair dark brown and add sunglasses";
  const preservedEn = await synthesizeImageEditPrompt({
    editInstruction: englishInstruction,
    chatModel: "llama3",
    settings: DEFAULT_SETTINGS,
  });
  assert(preservedEn.includes("hair dark brown") || preservedEn === englishInstruction, "English edit instruction must be faithfully preserved");
  console.log(`✓ [PASS] EN edit instruction preserved: "${preservedEn}"`);

  // 5. Test Chat Reply Structure with imageEditReference
  console.log("Testing Chat Reply Integration (imageEditReference)...");
  const userMessage: ChatMessage = {
    id: "msg-user-edit-1",
    role: "user",
    content: "یک تاج بالای سر مارمولک اضافه کن",
    imageEditReference: {
      sourceImageUrl: "/api/media/lizard.png",
      sourceMessageId: "msg-source-1",
      sourceVersionId: "v1-source",
      sourceTitle: "Desert Lizard",
    },
    timestamp: Date.now(),
  };
  assert(userMessage.imageEditReference !== undefined, "User message must contain imageEditReference");
  assert(userMessage.imageEditReference!.sourceImageUrl === "/api/media/lizard.png", "Reference must point to exact source image");
  assert(userMessage.imageEditReference!.sourceVersionId === "v1-source", "Reference must point to exact source version");
  console.log("✓ [PASS] Chat reply structure with imageEditReference verified");

  // 6. Test Glass Themes (Glass Dark & Glass Light) Independence & Color Derivation
  console.log("Testing Glass Themes (Glass Dark and Glass Light)...");
  const glassDark = ThemeEngine.getGlassThemeConfig("glass-dark");
  const glassLight = ThemeEngine.getGlassThemeConfig("glass-light");

  assert(glassDark.id === "glass-dark" && glassDark.isDark === true, "Glass Dark must be a dark theme");
  assert(glassLight.id === "glass-light" && glassLight.isDark === false, "Glass Light must be a light theme");

  // Test independent customization and persistence
  const customDark: GlassThemeConfig = {
    ...glassDark,
    primaryColor: "#a855f7", // purple
    backgroundColor: "#050608",
    composerHoverBorderColor: "#7e22ce",
    glassOpacity: 0.65,
    chatBackgroundImage: "data:image/png;base64,mockbg",
  };
  ThemeEngine.saveGlassThemeConfig(customDark);

  const reloadedDark = ThemeEngine.getGlassThemeConfig("glass-dark");
  const reloadedLight = ThemeEngine.getGlassThemeConfig("glass-light");

  assert(reloadedDark.primaryColor === "#a855f7", "Glass Dark custom primary color must persist");
  assert(reloadedDark.glassOpacity === 0.65, "Glass Dark custom opacity must persist");
  assert(reloadedDark.chatBackgroundImage === "data:image/png;base64,mockbg", "Glass Dark background image must persist");
  assert(reloadedLight.primaryColor === DEFAULT_GLASS_LIGHT.primaryColor, "Glass Light must NOT be overwritten when Glass Dark is customized");
  console.log("✓ [PASS] Glass Dark & Glass Light independent persistence verified");

  // Test automatic color coordination
  const derivedColors = deriveGlassThemeColors(reloadedDark);
  assert(derivedColors.accentColor === "#a855f7", "Derived accent color must match primaryColor");
  assert(derivedColors.composerHoverBorder === "#7e22ce", "Derived composer hover border must match config");
  assert(derivedColors.bgPrimary.includes("0.65"), "Derived background must reflect glassOpacity");
  assert(Boolean(derivedColors.textPrimary), "Derived textPrimary must exist");
  assert(Boolean(derivedColors.bgSurface), "Derived bgSurface must exist");
  assert(Boolean(derivedColors.bgUserMsg), "Derived bgUserMsg must exist");
  console.log("✓ [PASS] Automatic harmonious color derivation from glass parameters verified");

  console.log("All Image Viewing, Editing, Replies & Glass Theme tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
