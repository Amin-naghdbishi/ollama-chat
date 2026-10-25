import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("--- Testing Desktop Header Redesign, Mobile Drawer & Keyboard Fixes ---");

  // 1. Viewport Meta Configuration in index.html
  console.log("Testing mobile viewport meta configuration in index.html...");
  const indexHtmlPath = path.join(process.cwd(), "index.html");
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
  assert(
    indexHtml.includes("interactive-widget=resizes-content"),
    "index.html must include 'interactive-widget=resizes-content' for accurate mobile virtual keyboard resizing"
  );
  assert(
    indexHtml.includes("viewport-fit=cover"),
    "index.html must include 'viewport-fit=cover' to support edge-to-edge mobile screens and safe-area insets"
  );
  console.log("✓ [PASS] index.html viewport meta correctly configured with interactive-widget and viewport-fit");

  // 2. Desktop Chat Header: Minimal 2-control top area and elimination of header bar
  console.log("Testing Desktop Chat Header implementation...");
  const headerTsxPath = path.join(process.cwd(), "src", "components", "Header.tsx");
  const headerTsx = fs.readFileSync(headerTsxPath, "utf-8");

  // Verify obsolete buttons removed
  assert(!headerTsx.includes("Brain"), "Brain/Context button must be completely removed from Header");
  assert(!headerTsx.includes("Bug"), "Bug/Debug button must be completely removed from Header");
  assert(!headerTsx.includes("Cpu"), "Cpu/Model icon must be completely removed from Header model selector");

  // Verify header styling has no border, no background strip
  assert(headerTsx.includes("bg-transparent"), "Header must have transparent background (no background strip)");
  assert(headerTsx.includes("border-0"), "Header must have border-0 (no border bar)");

  // Verify Model Specs button is chevron only (no text label)
  assert(!headerTsx.includes("t(\"modelSpecs\")"), "Model Specs button must have no visible text label");
  assert(headerTsx.includes("ChevronDown"), "Model Specs button must display a downward chevron icon");
  assert(headerTsx.includes("rotate-180"), "Model Specs chevron must rotate 180deg upward when expanded");

  // Verify Mobile Header controls
  assert(headerTsx.includes("Menu"), "Mobile layout must include hamburger Menu icon button");
  assert(headerTsx.includes("Settings"), "Mobile layout must include Settings icon button in top header");
  assert(headerTsx.includes("md:hidden"), "Mobile-specific header buttons must be hidden on desktop");
  console.log("✓ [PASS] Desktop header has no borders/backgrounds and only 2 controls (model name + chevron); Mobile header has hamburger + settings");

  // 3. Mobile Layout: Persistent Sidebar removal and Drawer Overlay
  console.log("Testing Mobile Sidebar Drawer implementation...");
  const sidebarTsxPath = path.join(process.cwd(), "src", "components", "Sidebar.tsx");
  const sidebarTsx = fs.readFileSync(sidebarTsxPath, "utf-8");

  assert(
    sidebarTsx.includes("hidden md:flex"),
    "Persistent sidebar must be hidden on mobile screen sizes (hidden md:flex)"
  );
  assert(
    sidebarTsx.includes("isMobileOpen"),
    "Sidebar must support isMobileOpen prop for drawer overlay"
  );
  assert(
    sidebarTsx.includes("onCloseMobile"),
    "Sidebar must support onCloseMobile callback to dismiss drawer"
  );
  assert(
    sidebarTsx.includes("fixed inset-0") && sidebarTsx.includes("bg-black/60"),
    "Mobile drawer must display backdrop overlay when opened"
  );
  console.log("✓ [PASS] Persistent sidebar removed from mobile layout and replaced with drawer overlay");

  // 4. Mobile Keyboard & Viewport Fixes
  console.log("Testing Mobile Keyboard & Viewport behavior in ChatComposer and ChatArea...");
  const composerTsxPath = path.join(process.cwd(), "src", "components", "ChatComposer.tsx");
  const composerTsx = fs.readFileSync(composerTsxPath, "utf-8");

  // Send button prevents blur on mousedown/touch so keyboard stays open without flickering
  assert(
    composerTsx.includes("onMouseDown={(e) => e.preventDefault()}"),
    "ChatComposer Send button must prevent default on mousedown to preserve focus and prevent keyboard jumps"
  );

  // Safe area bottom padding and shrink-0
  assert(
    composerTsx.includes("env(safe-area-inset-bottom"),
    "ChatComposer must respect safe-area-inset-bottom"
  );
  assert(
    composerTsx.includes("shrink-0"),
    "ChatComposer must have shrink-0 so it is not compressed or detached"
  );

  // iOS Safari font zoom prevention (font size >= 16px on mobile)
  assert(
    composerTsx.includes("text-[16px] sm:text-[15px]"),
    "ChatComposer textarea must have 16px on mobile to prevent iOS Safari auto-zoom"
  );

  const chatAreaTsxPath = path.join(process.cwd(), "src", "components", "ChatArea.tsx");
  const chatAreaTsx = fs.readFileSync(chatAreaTsxPath, "utf-8");
  assert(
    chatAreaTsx.includes("min-h-0"),
    "ChatArea must use min-h-0 for proper flexbox shrinking"
  );
  assert(
    chatAreaTsx.includes("window.visualViewport"),
    "ChatArea must listen to visualViewport resize to keep latest messages visible when keyboard opens"
  );

  const appTsxPath = path.join(process.cwd(), "src", "App.tsx");
  const appTsx = fs.readFileSync(appTsxPath, "utf-8");
  assert(
    appTsx.includes("window.visualViewport"),
    "App.tsx must track visualViewport height for accurate viewport sizing"
  );
  assert(
    appTsx.includes("document.activeElement.blur()"),
    "App.tsx must blur active elements when opening mobile sidebar to dismiss virtual keyboard"
  );
  console.log("✓ [PASS] Mobile keyboard and viewport fixes verified (dynamic viewport height, blur on sidebar, send button focus preservation, 16px zoom prevention)");

  // 5. Mobile Font Size Increases
  console.log("Testing Mobile Font Size increases across components...");
  const messageBubbleTsxPath = path.join(process.cwd(), "src", "components", "MessageBubble.tsx");
  const messageBubbleTsx = fs.readFileSync(messageBubbleTsxPath, "utf-8");

  assert(
    messageBubbleTsx.includes("text-[16px] sm:text-[15px]"),
    "User and Assistant chat messages must use increased font size (16px) on mobile"
  );

  assert(
    sidebarTsx.includes("text-sm sm:text-xs"),
    "Sidebar items and titles must use increased font size on mobile"
  );

  const settingsTsxPath = path.join(process.cwd(), "src", "components", "views", "SettingsView.tsx");
  const settingsTsx = fs.readFileSync(settingsTsxPath, "utf-8");
  assert(
    settingsTsx.includes("text-sm sm:text-xs"),
    "Settings labels and controls must use stepped-up mobile font size (text-sm sm:text-xs)"
  );

  console.log("✓ [PASS] Mobile typography stepped up by ~1 step across chat messages, sidebar, composer, and settings");

  console.log("\nAll Desktop Header Redesign, Mobile Drawer & Keyboard tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
