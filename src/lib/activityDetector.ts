import { AIActivityPhase, AIActivityState, FileAttachment } from "../types";
import { Language, getTranslation, TranslationKey } from "./i18n";

/**
 * Maps an internal AI Activity Phase directly to its localized TranslationKey.
 */
export function getActivityTranslationKey(phase: AIActivityPhase): TranslationKey {
  switch (phase) {
    // Thinking / Reasoning
    case "thinking":
      return "activity_thinking";
    case "reasoning":
      return "activity_reasoning";
    case "analyzing":
      return "activity_analyzing";
    case "planning":
      return "activity_planning";
    case "working_through":
      return "activity_working_through";
    case "forming_answer":
      return "activity_forming_answer";

    // Memory / Recall
    case "searching_memories":
      return "activity_searching_memories";
    case "recalling":
      return "activity_recalling";
    case "looking_through_memories":
      return "activity_looking_through_memories";
    case "finding_memories":
      return "activity_finding_memories";
    case "retrieving_memories":
      return "activity_retrieving_memories";
    case "checking_past_conversations":
      return "activity_checking_past_conversations";
    case "looking_back":
      return "activity_looking_back";
    case "searching_previous_conversations":
      return "activity_searching_previous_conversations";
    case "memory_found":
      return "activity_memory_found";
    case "relevant_memories_found":
      return "activity_relevant_memories_found";
    case "context_restored":
      return "activity_context_restored";

    // Context Compression
    case "compressing_context":
      return "activity_compressing_context";
    case "organizing_context":
      return "activity_organizing_context";
    case "preserving_info":
      return "activity_preserving_info";
    case "creating_memory":
      return "activity_creating_memory";
    case "updating_memory":
      return "activity_updating_memory";
    case "rebuilding_context":
      return "activity_rebuilding_context";
    case "reconstructing_context":
      return "activity_reconstructing_context";

    // File / Image Processing
    case "reading_file":
      return "activity_reading_file";
    case "analyzing_file":
      return "activity_analyzing_file";
    case "inspecting_document":
      return "activity_inspecting_document";
    case "processing_file":
      return "activity_processing_file";
    case "reviewing_contents":
      return "activity_reviewing_contents";
    case "analyzing_image":
      return "activity_analyzing_image";

    // Code Work
    case "analyzing_code":
      return "activity_analyzing_code";
    case "writing_code":
      return "activity_writing_code";
    case "reviewing_code":
      return "activity_reviewing_code";
    case "checking_implementation":
      return "activity_checking_implementation";
    case "debugging":
      return "activity_debugging";
    case "planning_implementation":
      return "activity_planning_implementation";

    // Normal Generation
    case "working":
      return "activity_working";
    case "generating":
      return "activity_generating";
    case "processing":
      return "activity_processing";
    case "preparing":
      return "activity_preparing";
    case "working_on_it":
      return "activity_working_on_it";
    case "almost_there":
      return "activity_almost_there";
    case "checking":
      return "activity_checking";
    case "reviewing":
      return "activity_reviewing";

    case "idle":
    default:
      return "generating";
  }
}

/**
 * Returns the localized text for the given activity state.
 */
export function getActivityStatusLabel(
  state: AIActivityState | AIActivityPhase | undefined,
  language: Language = "en"
): string {
  if (!state) return getTranslation(language, "generating");
  
  if (typeof state === "object") {
    if (state.customText) return state.customText;
    const key = getActivityTranslationKey(state.phase);
    return getTranslation(language, key);
  }

  const key = getActivityTranslationKey(state);
  return getTranslation(language, key);
}

/**
 * Reliably detects if the user request involves code-related work.
 * Checks for code fences, programming languages keywords, syntax symbols, or code file attachments.
 */
export function detectCodeIntent(prompt: string, attachments?: FileAttachment[]): boolean {
  if (!prompt && (!attachments || attachments.length === 0)) return false;

  // 1. Check if attached files have code extensions
  if (attachments && attachments.length > 0) {
    const codeExtensions = [
      ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
      ".py", ".rs", ".go", ".cpp", ".c", ".h", ".hpp",
      ".java", ".cs", ".php", ".rb", ".swift", ".kt",
      ".sql", ".html", ".css", ".scss", ".json", ".yaml",
      ".yml", ".toml", ".sh", ".bash", ".zsh", ".dockerfile"
    ];
    const hasCodeAttachment = attachments.some((att) => {
      const lower = (att.name || "").toLowerCase();
      return codeExtensions.some((ext) => lower.endsWith(ext));
    });
    if (hasCodeAttachment) return true;
  }

  const text = prompt.trim();
  if (!text) return false;

  // 2. Check for markdown code blocks
  if (text.includes("```") || text.includes("`") && text.match(/`[a-zA-Z0-9_$.]+\(/)) {
    return true;
  }

  // 3. Check for distinct coding keywords with boundary matching
  const codePatterns = [
    /\b(function|const|let|var|def|class|interface|type|enum|struct|fn|impl|import|export|return|async|await)\b/,
    /\b(react|useState|useEffect|useMemo|useCallback|component|props)\b/i,
    /\b(typescript|javascript|python|golang|rust|c\+\+|sql|sqlite|postgres|html|css|tailwind)\b/i,
    /\b(refactor|debug|fix the bug|syntax error|stack trace|nullpointer|exception|compile error)\b/i,
    /\b(write a function|write code|implement a|create a script|regex for|algorithm for)\b/i,
    /\b(SELECT\s+[\w*]+\s+FROM|INSERT\s+INTO|CREATE\s+TABLE|ALTER\s+TABLE)\b/i,
    /(\=>|=>|\{\s*return|\(\)\s*=>)/,
  ];

  return codePatterns.some((pat) => pat.test(text));
}

/**
 * Evaluates file attachment metadata.
 */
export function detectFileIntent(attachments?: FileAttachment[]) {
  if (!attachments || attachments.length === 0) {
    return {
      hasFiles: false,
      hasImages: false,
      fileCount: 0,
      imageCount: 0,
      firstFileName: undefined,
      isCodeFile: false,
    };
  }

  const images = attachments.filter((a) => a.isImage);
  const nonImages = attachments.filter((a) => !a.isImage);
  const isCode = detectCodeIntent("", attachments);

  return {
    hasFiles: attachments.length > 0,
    hasImages: images.length > 0,
    fileCount: nonImages.length,
    imageCount: images.length,
    firstFileName: attachments[0]?.name,
    isCodeFile: isCode,
  };
}

/**
 * Returns appropriate icon category for visual rendering.
 */
export function getActivityIconType(phase: AIActivityPhase): "spinner" | "brain" | "memory" | "file" | "code" | "check" {
  switch (phase) {
    case "thinking":
    case "reasoning":
    case "analyzing":
    case "planning":
    case "working_through":
    case "forming_answer":
      return "brain";

    case "searching_memories":
    case "recalling":
    case "looking_through_memories":
    case "finding_memories":
    case "retrieving_memories":
    case "checking_past_conversations":
    case "looking_back":
    case "searching_previous_conversations":
    case "compressing_context":
    case "organizing_context":
    case "preserving_info":
    case "creating_memory":
    case "updating_memory":
    case "rebuilding_context":
    case "reconstructing_context":
      return "memory";

    case "memory_found":
    case "relevant_memories_found":
    case "context_restored":
      return "check";

    case "reading_file":
    case "analyzing_file":
    case "inspecting_document":
    case "processing_file":
    case "reviewing_contents":
    case "analyzing_image":
      return "file";

    case "analyzing_code":
    case "writing_code":
    case "reviewing_code":
    case "checking_implementation":
    case "debugging":
    case "planning_implementation":
      return "code";

    case "working":
    case "generating":
    case "processing":
    case "preparing":
    case "working_on_it":
    case "almost_there":
    case "checking":
    case "reviewing":
    case "idle":
    default:
      return "spinner";
  }
}
