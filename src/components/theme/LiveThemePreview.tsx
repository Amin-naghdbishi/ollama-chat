import React, { useState } from "react";
import {
  Cpu,
  Send,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Plus,
  MessageSquare,
  Folder,
  Sliders,
  Settings,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Image as ImageIcon,
  Flame,
  Search,
  Hash,
} from "lucide-react";
import { ThemeColors } from "../../lib/themeEngine";

interface LiveThemePreviewProps {
  colors: ThemeColors;
  isDark: boolean;
  themeName: string;
}

export const LiveThemePreview: React.FC<LiveThemePreviewProps> = ({
  colors,
  isDark,
  themeName,
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "components" | "sidebar">("chat");
  const [isThinkingOpen, setIsThinkingOpen] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [previewInput, setPreviewInput] = useState("Explain quicksort in Python with visualization");
  const [testHoverBtn, setTestHoverBtn] = useState(false);
  const [testActiveBtn, setTestActiveBtn] = useState(false);

  // Convert theme colors to inline CSS variables mapping
  const previewCssVars: React.CSSProperties = {
    ["--bg-primary" as any]: colors.bgPrimary,
    ["--bg-secondary" as any]: colors.bgSecondary,
    ["--bg-surface" as any]: colors.bgSurface,
    ["--bg-elevated" as any]: colors.bgElevated || colors.bgSurface,
    ["--bg-header" as any]: colors.bgHeader,

    ["--text-primary" as any]: colors.textPrimary,
    ["--text-secondary" as any]: colors.textSecondary,
    ["--text-muted" as any]: colors.textMuted,
    ["--text-disabled" as any]: colors.textDisabled || "#6b7280",

    ["--accent-color" as any]: colors.accentColor,
    ["--accent-hover" as any]: colors.accentHover,
    ["--accent-active" as any]: colors.accentActive || colors.accentHover,
    ["--accent-text" as any]: colors.accentText,

    ["--btn-bg" as any]: colors.btnBg,
    ["--btn-text" as any]: colors.btnText,
    ["--btn-hover" as any]: colors.btnHover,
    ["--btn-active" as any]: colors.btnActive,
    ["--btn-disabled-bg" as any]: colors.btnDisabledBg || colors.btnBg,
    ["--btn-disabled-text" as any]: colors.btnDisabledText || colors.textDisabled || "#6b7280",

    ["--input-bg" as any]: colors.inputBg,
    ["--input-text" as any]: colors.inputText || colors.textPrimary,
    ["--input-border" as any]: colors.inputBorder,
    ["--input-focus" as any]: colors.inputFocus,
    ["--input-placeholder" as any]: colors.inputPlaceholder || colors.textMuted,

    ["--bg-sidebar" as any]: colors.bgSidebar,
    ["--sidebar-text" as any]: colors.sidebarText || colors.textSecondary,
    ["--sidebar-hover" as any]: colors.sidebarHover || colors.btnHover,
    ["--sidebar-active" as any]: colors.sidebarActive || colors.bgSurface,
    ["--sidebar-border" as any]: colors.sidebarBorder || colors.borderColor,

    ["--bg-user-msg" as any]: colors.bgUserMsg,
    ["--user-msg-text" as any]: colors.userMsgText || colors.textPrimary,
    ["--bg-assistant-msg" as any]: colors.bgAssistantMsg,
    ["--assistant-msg-text" as any]: colors.assistantMsgText || colors.textPrimary,
    ["--message-hover" as any]: colors.messageHover || "rgba(255, 255, 255, 0.03)",
    ["--message-border" as any]: colors.messageBorder || colors.borderColor,

    ["--code-bg" as any]: colors.codeBg,
    ["--code-header-bg" as any]: colors.codeHeaderBg,
    ["--code-text" as any]: colors.codeText || colors.textPrimary,
    ["--code-border" as any]: colors.codeBorder || colors.borderColor,
    ["--code-inline-bg" as any]: colors.codeInlineBg,
    ["--code-inline-text" as any]: colors.codeInlineText,
    ["--syntax-keyword" as any]: colors.syntaxKeyword || "",
    ["--syntax-function" as any]: colors.syntaxFunction || "",
    ["--syntax-variable" as any]: colors.syntaxVariable || "",
    ["--syntax-string" as any]: colors.syntaxString || "",
    ["--syntax-number" as any]: colors.syntaxNumber || "",
    ["--syntax-comment" as any]: colors.syntaxComment || "",
    ["--syntax-type" as any]: colors.syntaxType || "",

    ["--border-color" as any]: colors.borderColor,
    ["--border-subtle" as any]: colors.borderSubtle,
    ["--border-strong" as any]: colors.borderStrong || colors.borderColor,

    ["--color-error" as any]: colors.colorError,
    ["--color-warning" as any]: colors.colorWarning,
    ["--color-success" as any]: colors.colorSuccess,
    ["--link-color" as any]: colors.linkColor,

    // Composer Container
    ["--composer-bg" as any]: colors.composerBg || colors.bgSurface || colors.inputBg,
    ["--composer-border" as any]: colors.composerBorder || colors.borderColor || colors.inputBorder,
    ["--composer-focus-border" as any]: colors.composerFocusBorder || colors.accentColor || colors.inputFocus,
    ["--composer-text" as any]: colors.composerText || colors.inputText || colors.textPrimary,
    ["--composer-placeholder" as any]: colors.composerPlaceholder || colors.inputPlaceholder || colors.textMuted,

    // Composer Send Button
    ["--composer-send-bg" as any]: colors.composerSendBg || colors.accentColor,
    ["--composer-send-hover-bg" as any]: colors.composerSendHoverBg || colors.composerSendHover || colors.accentHover,
    ["--composer-send-disabled-bg" as any]: colors.composerSendDisabledBg || colors.btnDisabledBg || colors.btnBg,
    ["--composer-send-icon" as any]: colors.composerSendIcon || colors.composerSendText || colors.accentText,
    ["--composer-send-hover-icon" as any]: colors.composerSendHoverIcon || colors.composerSendIcon || colors.composerSendText || colors.accentText,
    ["--composer-send-disabled-icon" as any]: colors.composerSendDisabledIcon || colors.textMuted,
    ["--composer-send-generating-bg" as any]: colors.composerSendGeneratingBg || colors.textPrimary,
    ["--composer-send-generating-hover-bg" as any]: colors.composerSendGeneratingHoverBg || colors.composerSendGeneratingBg || colors.textPrimary,
    ["--composer-send-generating-icon" as any]: colors.composerSendGeneratingIcon || colors.bgPrimary,

    // Composer Thinking Button
    ["--composer-think-off-bg" as any]: colors.composerThinkOffBg || "#27272a",
    ["--composer-think-off-text" as any]: colors.composerThinkOffText || "#a1a1aa",
    ["--composer-think-off-border" as any]: colors.composerThinkOffBorder || "#3f3f46",
    ["--composer-think-off-hover-bg" as any]: colors.composerThinkOffHoverBg || "#323238",
    ["--composer-think-off-hover-text" as any]: colors.composerThinkOffHoverText || "#e4e4e7",
    ["--composer-think-on-bg" as any]: colors.composerThinkOnBg || "#e4e4e7",
    ["--composer-think-on-text" as any]: colors.composerThinkOnText || "#18181b",
    ["--composer-think-on-border" as any]: colors.composerThinkOnBorder || "#d4d4d8",
    ["--composer-think-on-hover-bg" as any]: colors.composerThinkOnHoverBg || "#f4f4f5",
    ["--composer-think-on-hover-text" as any]: colors.composerThinkOnHoverText || "#18181b",

    // Composer Add File Button
    ["--composer-add-file-bg" as any]: colors.composerAddFileBg || colors.btnBg,
    ["--composer-add-file-border" as any]: colors.composerAddFileBorder || colors.borderColor,
    ["--composer-add-file-text" as any]: colors.composerAddFileText || colors.textSecondary,
    ["--composer-add-file-hover-bg" as any]: colors.composerAddFileHoverBg || colors.btnHover,
    ["--composer-add-file-hover-border" as any]: colors.composerAddFileHoverBorder || colors.borderStrong || colors.borderColor,
    ["--composer-add-file-hover-text" as any]: colors.composerAddFileHoverText || colors.textPrimary,
  };

  const handleCopyCode = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-[var(--border-color,#282a36)] bg-[var(--bg-secondary,#191a21)] overflow-hidden shadow-xl">
      {/* Live Preview Header Toolbar */}
      <div className="p-3 border-b border-[var(--border-color,#282a36)] bg-[var(--bg-surface,#1f212a)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-xs text-[var(--text-primary,#e6e9f0)]">Live Interactive Preview</span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--btn-bg,#1c1e27)] border border-[var(--border-color,#282a36)] text-[10px] font-mono text-[var(--text-muted,#6b7280)]">
            {isDark ? "Dark Theme" : "Light Theme"}
          </span>
        </div>

        {/* Preview Tabs */}
        <div className="flex items-center gap-1 bg-[var(--bg-primary,#131418)] p-1 rounded-xl border border-[var(--border-subtle,#1e2029)]">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "chat"
                ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
            }`}
          >
            Chat View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sidebar")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "sidebar"
                ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
            }`}
          >
            Sidebar View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("components")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "components"
                ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] shadow-xs"
                : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)]"
            }`}
          >
            Components & States
          </button>
        </div>
      </div>

      {/* Scoped Preview Container applying exact CSS variables */}
      <div
        style={previewCssVars}
        className="flex-1 flex flex-col overflow-hidden text-[var(--text-primary)] bg-[var(--bg-primary)] select-text relative font-sans transition-colors duration-150"
      >
        {/* ====================================================================
            TAB 1: CHAT VIEW PREVIEW
           ==================================================================== */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mock Header */}
            <div className="px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-header)] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)]">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[var(--text-primary)]">qwen2.5-coder:7b</span>
                    <span className="px-1.5 py-0.2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[9px] font-mono text-[var(--text-secondary)]">
                      4.7 GB
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] truncate">Algorithm Optimization Workspace</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--btn-bg)] border border-[var(--border-color)] text-[10px] font-medium text-[var(--text-secondary)]">
                  <Sparkles className="w-3 h-3 text-[var(--accent-color)]" />
                  <span>Thinking (On)</span>
                </div>
                <div className="w-6 h-6 rounded-lg bg-[var(--btn-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)]">
                  <Sliders className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Mock Chat Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* User Message Bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl p-3 bg-[var(--bg-user-msg)] text-[var(--user-msg-text)] border border-[var(--border-subtle)] shadow-xs">
                  <p className="text-xs leading-relaxed">
                    Can you write an in-place QuickSort algorithm in Python and explain the time complexity?
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-[var(--border-subtle)]/40 text-[10px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-[var(--accent-color)]" />
                      <span>dataset.csv (14 KB)</span>
                    </span>
                    <span>•</span>
                    <span>11:42 AM</span>
                  </div>
                </div>
              </div>

              {/* Assistant Message */}
              <div className="flex flex-col space-y-2.5 max-w-[95%]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[var(--accent-color)] text-[var(--accent-text)] flex items-center justify-center text-[10px] font-bold">
                    AI
                  </div>
                  <span className="font-semibold text-xs text-[var(--text-primary)]">qwen2.5-coder</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">48.2 tok/s</span>
                </div>

                {/* Collapsible Reasoning Block */}
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                      <span>Thought Process</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">(1.4s • 128 tokens)</span>
                    </div>
                    {isThinkingOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>

                  {isThinkingOpen && (
                    <div className="p-3 pt-0 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] font-mono leading-relaxed bg-[var(--bg-primary)]/40">
                      Analyzing QuickSort partitioning strategy. Choosing Lomuto partition scheme for clean readability,
                      average complexity of O(N log N).
                    </div>
                  )}
                </div>

                {/* Response Text with Inline Code */}
                <div className="p-3.5 rounded-2xl bg-[var(--bg-assistant-msg)] text-[var(--assistant-msg-text)] border border-[var(--message-border)] space-y-3">
                  <p className="text-xs leading-relaxed text-[var(--text-primary)]">
                    Here is the standard in-place implementation using a <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-[var(--code-inline-bg)] text-[var(--code-inline-text)]">partition</span> helper:
                  </p>

                  {/* Code Block */}
                  <div className="rounded-xl overflow-hidden border border-[var(--code-border)] bg-[var(--code-bg)] text-[var(--code-text)]">
                    <div className="px-3 py-1.5 bg-[var(--code-header-bg)] border-b border-[var(--code-border)] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[var(--text-secondary)] font-bold">python</span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--btn-bg)] hover:bg-[var(--btn-hover)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] transition-colors cursor-pointer"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3 h-3 text-[var(--color-success)]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 text-[11px] font-mono leading-relaxed overflow-x-auto text-[var(--code-text)]">
                      <code className="hljs">
                        <span className="hljs-keyword">def</span>{" "}
                        <span className="hljs-title function_">quicksort</span>(arr, low=<span className="hljs-number">0</span>, high=<span className="hljs-literal">None</span>):{"\n"}
                        {"    "}<span className="hljs-keyword">if</span> high <span className="hljs-keyword">is</span> <span className="hljs-literal">None</span>:{"\n"}
                        {"        "}high = <span className="hljs-built_in">len</span>(arr) - <span className="hljs-number">1</span>{"\n"}
                        {"    "}<span className="hljs-keyword">if</span> low &lt; high:{"\n"}
                        {"        "}pi = <span className="hljs-title function_">partition</span>(arr, low, high){"\n"}
                        {"        "}<span className="hljs-title function_">quicksort</span>(arr, low, pi - <span className="hljs-number">1</span>){"\n"}
                        {"        "}<span className="hljs-title function_">quicksort</span>(arr, pi + <span className="hljs-number">1</span>, high){"\n"}
                        {"    "}<span className="hljs-keyword">return</span> arr
                      </code>
                    </pre>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Time complexity is <strong className="text-[var(--text-primary)]">O(N log N)</strong> on average, with <span className="text-[var(--link-color)] hover:underline cursor-pointer">O(log N) auxiliary stack space</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Mock Composer */}
            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0">
              <div className="flex items-center gap-2 p-2 rounded-2xl bg-[var(--composer-bg)] border border-[var(--composer-border)] focus-within:border-[var(--composer-focus-border)] focus-within:ring-2 focus-within:ring-[var(--composer-focus-border)]/20 transition-all">
                {/* Add file button */}
                <button
                  type="button"
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--composer-add-file-bg)] border border-[var(--composer-add-file-border)] text-[var(--composer-add-file-text)] hover:text-[var(--composer-add-file-hover-text)] hover:bg-[var(--composer-add-file-hover-bg)] hover:border-[var(--composer-add-file-hover-border)] transition-colors cursor-pointer shrink-0"
                  title="Add File"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="text"
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  placeholder="Ask Ollama anything..."
                  className="flex-1 bg-transparent text-xs text-[var(--composer-text)] placeholder-[var(--composer-placeholder)] focus:outline-hidden px-1"
                />

                {/* Thinking Button toggle in preview */}
                <button
                  type="button"
                  onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                  className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                    isThinkingOpen
                      ? "bg-[var(--composer-think-on-bg)] text-[var(--composer-think-on-text)] border border-[var(--composer-think-on-border)] hover:bg-[var(--composer-think-on-hover-bg)] hover:text-[var(--composer-think-on-hover-text)]"
                      : "bg-[var(--composer-think-off-bg)] text-[var(--composer-think-off-text)] border border-[var(--composer-think-off-border)] hover:bg-[var(--composer-think-off-hover-bg)] hover:text-[var(--composer-think-off-hover-text)]"
                  }`}
                  title="Toggle Thinking"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Think</span>
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  className="w-7 h-7 rounded-full bg-[var(--composer-send-bg)] text-[var(--composer-send-icon)] hover:bg-[var(--composer-send-hover-bg)] hover:text-[var(--composer-send-hover-icon)] flex items-center justify-center shadow-xs transition-colors cursor-pointer shrink-0"
                  title="Send Message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: SIDEBAR VIEW PREVIEW
           ==================================================================== */}
        {activeTab === "sidebar" && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-64 bg-[var(--bg-sidebar)] border-r border-[var(--sidebar-border)] flex flex-col p-3 space-y-3">
              {/* New Chat Button */}
              <button
                type="button"
                className="w-full py-2 px-3 rounded-xl bg-[var(--accent-color)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Conversation</span>
              </button>

              {/* Search */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--input-text)]">
                <Search className="w-3.5 h-3.5 text-[var(--input-placeholder)]" />
                <span className="text-[var(--input-placeholder)] text-[11px]">Search conversations...</span>
              </div>

              {/* Folder & Chats List */}
              <div className="flex-1 space-y-1 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Pinned & Folders
                </div>

                {/* Folder Header */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                    <span>Work Projects</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">3</span>
                </div>

                {/* Active Chat Item */}
                <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-[var(--sidebar-active)] text-[var(--text-primary)] border border-[var(--border-color)] font-medium text-xs shadow-xs cursor-pointer">
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-color)] shrink-0" />
                    <span className="truncate">QuickSort In-place Optimization</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-color)] shrink-0" />
                </div>

                {/* Standard / Hoverable Chat Items */}
                <div className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)] transition-colors text-xs cursor-pointer">
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span className="truncate">React Theme Engine Integration</span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2.5 py-2 rounded-xl text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)] transition-colors text-xs cursor-pointer">
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span className="truncate">Local Ollama Model Benchmarks</span>
                  </div>
                </div>
              </div>

              {/* Sidebar Footer User / Settings */}
              <div className="pt-2 border-t border-[var(--sidebar-border)] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--sidebar-text)]">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[9px] font-mono text-[var(--color-success)]">
                  Connected
                </span>
              </div>
            </div>

            {/* Right Pane Info */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-2 bg-[var(--bg-primary)]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)] shadow-sm">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">{themeName} Sidebar Theme</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm">
                Verify sidebar background, navigation hover contrast, active item highlights, and folder badges.
              </p>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 3: COMPONENTS & INTERACTION STATES
           ==================================================================== */}
        {activeTab === "components" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* SECTION 1: BUTTON STATES */}
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-color)]">
                Button Interaction States
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Default Secondary Button */}
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-text)] border border-[var(--border-color)] text-xs font-medium hover:bg-[var(--btn-hover)] active:bg-[var(--btn-active)] transition-colors cursor-pointer text-center"
                >
                  Default Button
                </button>

                {/* Primary / Accent Button */}
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-[var(--accent-color)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] text-xs font-semibold shadow-xs transition-colors cursor-pointer text-center"
                >
                  Primary Accent
                </button>

                {/* Simulating Hover State */}
                <div
                  className="px-3 py-2 rounded-xl text-xs font-medium text-center border border-[var(--border-color)]"
                  style={{ backgroundColor: colors.btnHover, color: colors.btnText }}
                >
                  Hover State
                </div>

                {/* Disabled Button */}
                <button
                  type="button"
                  disabled
                  className="px-3 py-2 rounded-xl bg-[var(--btn-disabled-bg)] text-[var(--btn-disabled-text)] border border-[var(--border-subtle)] text-xs font-medium cursor-not-allowed text-center opacity-70"
                >
                  Disabled Button
                </button>
              </div>
            </div>

            {/* SECTION 2: INPUT & FORM STATES */}
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-color)]">
                Form Inputs & Focus Outlines
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Standard Input</label>
                  <input
                    type="text"
                    defaultValue="Ollama local endpoint"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] focus:border-[var(--input-focus)] text-xs focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Input with Placeholder</label>
                  <input
                    type="text"
                    placeholder="Enter custom system prompt..."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--input-bg)] text-[var(--input-text)] placeholder-[var(--input-placeholder)] border border-[var(--input-border)] focus:border-[var(--input-focus)] text-xs focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: SYSTEM FEEDBACK & ALERTS */}
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-color)]">
                Status & Notification Badges
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                  <span className="font-medium text-[var(--text-primary)]">Success Alert</span>
                </div>

                <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                  <span className="font-medium text-[var(--text-primary)]">Warning Warning</span>
                </div>

                <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-[var(--color-error)] shrink-0" />
                  <span className="font-medium text-[var(--text-primary)]">Error Alert</span>
                </div>
              </div>
            </div>

            {/* SECTION 4: TYPOGRAPHY & CONTRAST HIERARCHY */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-color)]">
                Typography Hierarchy
              </h4>
              <p className="text-sm font-bold text-[var(--text-primary)]">Primary Heading Level 1 (textPrimary)</p>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Secondary Label Text (textSecondary)</p>
              <p className="text-xs text-[var(--text-muted)]">Muted Helper / Timestamps Text (textMuted)</p>
              <p className="text-xs text-[var(--text-disabled)]">Disabled / Deactivated Text (textDisabled)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
