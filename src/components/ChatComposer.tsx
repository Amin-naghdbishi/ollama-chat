import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  ArrowUp,
  Square,
  Plus,
  FileText,
  X,
  Brain,
  AlertCircle,
  Paperclip,
  MessageSquare,
  BookOpen,
  Sparkles,
  Image as ImageIcon,
  Eye,
  RefreshCw,
  Download,
} from "lucide-react";
import { FileAttachment, ContextToolType } from "../types";
import { isVisionModel } from "../services/ollamaApi";
import { compressImageFile } from "../lib/contextUtils";
import { Language, getTranslation, isRtlText } from "../lib/i18n";

interface ChatComposerProps {
  onSendMessage: (content: string, attachments: FileAttachment[]) => void;
  onDirectImageGeneration?: (prompt: string) => void;
  onStopGeneration: () => void;
  isGenerating: boolean;
  selectedModel: string | null;
  enableThinking: boolean;
  thinkingMode?: "auto" | "on" | "off";
  onSetThinkingMode?: (mode: "auto" | "on" | "off") => void;
  onToggleThinking: () => void;
  enterToSend?: boolean;
  supportsThinking?: "supported" | "unsupported" | "unknown";
  language?: Language;
  draft?: string;
  onDraftChange?: (draft: string) => void;
  onOpenContextTool?: (tool: "search_memories" | "search_conversations" | "search_context") => void;
  placeholder?: string;
  className?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  onDirectImageGeneration,
  onStopGeneration,
  isGenerating,
  selectedModel,
  enableThinking,
  onToggleThinking,
  enterToSend = true,
  language = "en",
  draft = "",
  onDraftChange,
  onOpenContextTool,
  placeholder,
  className,
}) => {
  const [input, setInput] = useState(draft);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isDirectImageMode, setIsDirectImageMode] = useState(false);
  const [replacingAttachmentId, setReplacingAttachmentId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const prevIsGenerating = useRef(isGenerating);

  // Close + menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    if (isPlusMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPlusMenuOpen]);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);
  const inputIsRtl = isRtlText(input) || (language === "fa" && !input.trim());

  // Sync draft when conversation switches
  useEffect(() => {
    if (draft !== undefined && draft !== input) {
      setInput(draft);
    }
  }, [draft]);

  // Adjust height dynamically and determine single-line vs multi-line state smoothly
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    // If attachments exist, must be multi-line
    if (attachments.length > 0) {
      setIsMultiline(true);
      el.style.height = "auto";
      const scrollH = el.scrollHeight;
      el.style.height = `${Math.min(Math.max(scrollH, 44), 180)}px`;
      return;
    }

    // Explicit newlines mean multi-line
    if (input.includes("\n")) {
      setIsMultiline(true);
      el.style.height = "auto";
      const scrollH = el.scrollHeight;
      el.style.height = `${Math.min(Math.max(scrollH, 44), 180)}px`;
      return;
    }

    if (!input.trim()) {
      setIsMultiline(false);
      el.style.height = "26px";
      return;
    }

    // Measure scroll height smoothly
    el.style.height = "auto";
    const scrollH = el.scrollHeight;
    // Single line baseline height is <= 32px
    const multiline = scrollH > 32;
    setIsMultiline(multiline);

    if (multiline) {
      el.style.height = `${Math.min(Math.max(scrollH, 44), 180)}px`;
    } else {
      el.style.height = "26px";
    }
  }, [input, attachments.length]);

  // Focus chat input after generation finishes
  useEffect(() => {
    if (prevIsGenerating.current && !isGenerating) {
      const activeEl = document.activeElement;
      const isInteractingWithOtherInput =
        activeEl &&
        activeEl !== textareaRef.current &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.getAttribute("contenteditable") === "true");

      if (!isInteractingWithOtherInput && textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 40);
      }
    }
    prevIsGenerating.current = isGenerating;
  }, [isGenerating]);

  // Initial focus on model switch or mount
  useEffect(() => {
    if (!isGenerating && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 40);
    }
  }, [selectedModel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setInput(newVal);
    if (onDraftChange) {
      onDraftChange(newVal);
    }

    if (newVal.includes("\n") || attachments.length > 0) {
      setIsMultiline(true);
    } else if (!newVal.trim()) {
      setIsMultiline(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (!e.shiftKey && enterToSend) {
        e.preventDefault();
        if (!isGenerating) {
          handleSend();
        }
      } else {
        // Shift+Enter creates a new line
        setIsMultiline(true);
      }
    }
  };

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isGenerating || isCompressing) return;

    if (isDirectImageMode) {
      if (input.trim() && onDirectImageGeneration) {
        onDirectImageGeneration(input.trim());
      }
      setInput("");
      setAttachments([]);
      setIsMultiline(false);
      setIsDirectImageMode(false);
      if (onDraftChange) onDraftChange("");
      if (textareaRef.current) textareaRef.current.style.height = "26px";
      return;
    }

    onSendMessage(input.trim(), attachments);
    setInput("");
    setAttachments([]);
    setIsMultiline(false);
    if (onDraftChange) {
      onDraftChange("");
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "26px";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setReplacingAttachmentId(null);
      return;
    }

    const fileList = Array.from(files);
    setIsCompressing(true);
    setAttachmentError(null);

    try {
      const processedAttachments: FileAttachment[] = [];

      for (const file of fileList) {
        // Size validation (limit to 50MB)
        if (file.size > 50 * 1024 * 1024) {
          setAttachmentError(
            language === "fa"
              ? `فایل ${file.name} بیش از حد مجاز (۵۰ مگابایت) است.`
              : `File ${file.name} exceeds maximum size limit (50 MB).`
          );
          continue;
        }

        const isImage = file.type.startsWith("image/");
        const fileId = Math.random().toString(36).substring(2, 9);

        if (isImage) {
          try {
            const compressed = await compressImageFile(file, 1400, 0.85);
            processedAttachments.push({
              id: fileId,
              name: file.name,
              size: Math.round(compressed.base64Data.length * 0.75),
              type: "image/jpeg",
              dataUrl: compressed.dataUrl,
              base64Data: compressed.base64Data,
              isImage: true,
            });
          } catch (err) {
            console.error("Failed to process image attachment:", err);
            setAttachmentError(
              language === "fa"
                ? `خطا در پردازش تصویر ${file.name}`
                : `Error processing image ${file.name}`
            );
          }
        } else {
          try {
            const textContent = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (event) => resolve(event.target?.result as string || "");
              reader.onerror = () => reject(new Error("Failed to read file"));
              reader.readAsText(file);
            });

            processedAttachments.push({
              id: fileId,
              name: file.name,
              size: file.size,
              type: file.type || "text/plain",
              textContent,
              isImage: false,
            });
          } catch (readErr) {
            setAttachmentError(
              language === "fa"
                ? `امکان خواندن محتوای متنی فایل ${file.name} وجود ندارد.`
                : `Could not read text content of file ${file.name}.`
            );
          }
        }
      }

      if (replacingAttachmentId && processedAttachments.length > 0) {
        setAttachments((prev) =>
          prev.map((a) => (a.id === replacingAttachmentId ? processedAttachments[0] : a))
        );
      } else if (processedAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...processedAttachments]);
      }
    } finally {
      setIsCompressing(false);
      setReplacingAttachmentId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    if (previewAttachment?.id === id) {
      setPreviewAttachment(null);
    }
  };

  const handleStartReplaceAttachment = (id: string) => {
    setReplacingAttachmentId(id);
    fileInputRef.current?.click();
  };

  const hasImage = attachments.some((a) => a.isImage);
  const isSelectedVisionCapable = selectedModel
    ? isVisionModel(selectedModel)
    : false;

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isGenerating && !isCompressing;

  const renderAddFileButton = () => (
    <div className="relative shrink-0" ref={plusMenuRef}>
      <button
        type="button"
        onClick={() => setIsPlusMenuOpen((prev) => !prev)}
        disabled={isCompressing}
        className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-[var(--composer-add-file-bg,var(--btn-bg,#272832))] border border-[var(--composer-add-file-border,var(--border-color,#3b3e4f))] text-[var(--composer-add-file-text,var(--text-secondary,#9ba3b2))] hover:text-[var(--composer-add-file-hover-text,var(--text-primary,#e6e9f0))] hover:bg-[var(--composer-add-file-hover-bg,var(--btn-hover,#333646))] hover:border-[var(--composer-add-file-hover-border,var(--border-hover,#505469))] active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-40 shadow-xs ${
          isPlusMenuOpen ? "border-[var(--accent-color,#818cf8)] text-[var(--accent-color,#818cf8)] bg-[var(--btn-hover,#333646)]" : ""
        }`}
        title={language === "fa" ? "افزودن و ابزارهای متنی" : "Add & Context Tools (+)"}
        aria-label={language === "fa" ? "افزودن و ابزارهای متنی" : "Add & Context Tools (+)"}
      >
        <Plus className={`w-4.5 h-4.5 stroke-[2.2] transition-transform duration-150 ${isPlusMenuOpen ? "rotate-45" : ""}`} />
      </button>

      {/* + Menu Dropdown Popover */}
      {isPlusMenuOpen && (
        <div className="absolute bottom-full left-0 rtl:left-auto rtl:right-0 mb-2 w-52 sm:w-56 rounded-xl bg-[var(--bg-surface,#181920)] border border-[var(--border-color,#323545)] shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-fadeIn backdrop-blur-md">
          {/* 1. Add File */}
          <button
            type="button"
            onClick={() => {
              setIsPlusMenuOpen(false);
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary,#e4e6eb)] hover:bg-[var(--btn-hover,#242632)] transition-colors cursor-pointer text-left rtl:text-right group"
          >
            <Paperclip className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-200 transition-colors" />
            <span className="truncate">{t("addFile")}</span>
          </button>

          {/* 2. Direct Image Generation */}
          <button
            type="button"
            onClick={() => {
              setIsPlusMenuOpen(false);
              if (input.trim().length > 0 && onDirectImageGeneration) {
                onDirectImageGeneration(input.trim());
                setInput("");
                setAttachments([]);
                setIsMultiline(false);
                setIsDirectImageMode(false);
                onDraftChange?.("");
                if (textareaRef.current) textareaRef.current.style.height = "26px";
              } else {
                setIsDirectImageMode(true);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary,#e4e6eb)] hover:bg-[var(--btn-hover,#242632)] transition-colors cursor-pointer text-left rtl:text-right group"
          >
            <ImageIcon className="w-4 h-4 shrink-0 text-violet-400 group-hover:text-violet-300 transition-colors" />
            <span className="truncate">{t("generateImage")}</span>
          </button>

          {/* 3. Search Memories */}
          <button
            type="button"
            onClick={() => {
              setIsPlusMenuOpen(false);
              onOpenContextTool?.("search_memories");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary,#e4e6eb)] hover:bg-[var(--btn-hover,#242632)] transition-colors cursor-pointer text-left rtl:text-right group"
          >
            <Brain className="w-4 h-4 shrink-0 text-amber-400/90 group-hover:text-amber-300 transition-colors" />
            <span className="truncate">{t("searchMemories")}</span>
          </button>

          {/* 4. Search Conversations */}
          <button
            type="button"
            onClick={() => {
              setIsPlusMenuOpen(false);
              onOpenContextTool?.("search_conversations");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary,#e4e6eb)] hover:bg-[var(--btn-hover,#242632)] transition-colors cursor-pointer text-left rtl:text-right group"
          >
            <MessageSquare className="w-4 h-4 shrink-0 text-emerald-400/90 group-hover:text-emerald-300 transition-colors" />
            <span className="truncate">{t("searchConversations")}</span>
          </button>

          {/* 5. Search Context */}
          <button
            type="button"
            onClick={() => {
              setIsPlusMenuOpen(false);
              onOpenContextTool?.("search_context");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-primary,#e4e6eb)] hover:bg-[var(--btn-hover,#242632)] transition-colors cursor-pointer text-left rtl:text-right group"
          >
            <BookOpen className="w-4 h-4 shrink-0 text-sky-400/90 group-hover:text-sky-300 transition-colors" />
            <span className="truncate">{t("searchContext")}</span>
          </button>
        </div>
      )}
    </div>
  );

  const renderThinkingButton = () => (
    <button
      type="button"
      onClick={onToggleThinking}
      className={`h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0 text-xs ${
        enableThinking
          ? "bg-[var(--composer-think-on-bg,#e4e4e7)] text-[var(--composer-think-on-text,#18181b)] border border-[var(--composer-think-on-border,#d4d4d8)] hover:bg-[var(--composer-think-on-hover-bg,#f4f4f5)] hover:text-[var(--composer-think-on-hover-text,var(--composer-think-on-text,#18181b))] shadow-xs font-semibold"
          : "bg-[var(--composer-think-off-bg,#27272a)] text-[var(--composer-think-off-text,#a1a1aa)] border border-[var(--composer-think-off-border,#3f3f46)] hover:bg-[var(--composer-think-off-hover-bg,#323238)] hover:text-[var(--composer-think-off-hover-text,#e4e4e7)] font-medium"
      }`}
      title={enableThinking ? t("thinkingOn") : t("thinkingOff")}
      aria-label={enableThinking ? t("thinkingOn") : t("thinkingOff")}
    >
      <Brain className="w-3.5 h-3.5 shrink-0" />
      <span>{t("think")}</span>
    </button>
  );

  const renderSendButton = () => (
    <>
      {isGenerating ? (
        <button
          type="button"
          onClick={onStopGeneration}
          className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-[var(--composer-send-generating-bg,var(--text-primary,#e6e9f0))] text-[var(--composer-send-generating-icon,var(--bg-primary,#121318))] hover:bg-[var(--composer-send-generating-hover-bg,var(--composer-send-generating-bg,var(--text-primary,#e6e9f0)))] flex items-center justify-center hover:opacity-90 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
          title={t("stopGenerating")}
          aria-label={t("stopGenerating")}
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 ${
            canSend
              ? "bg-[var(--composer-send-bg,var(--accent-color,#818cf8))] text-[var(--composer-send-icon,var(--accent-text,#09090b))] hover:bg-[var(--composer-send-hover-bg,var(--accent-hover,#6366f1))] hover:text-[var(--composer-send-hover-icon,var(--composer-send-icon,var(--accent-text,#09090b)))] shadow-sm active:scale-95"
              : "bg-[var(--composer-send-disabled-bg,var(--btn-bg,#1c1e27))] text-[var(--composer-send-disabled-icon,var(--text-muted,#6b7280))] opacity-40 cursor-not-allowed"
          }`}
          title={t("send")}
          aria-label={t("send")}
        >
          <ArrowUp className="w-4.5 h-4.5 stroke-[2.5]" />
        </button>
      )}
    </>
  );

  return (
    <div className={className || "w-full max-w-3xl xl:max-w-4xl mx-auto px-3 sm:px-6 pb-2"}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      {/* Attachment Error Banner */}
      {attachmentError && (
        <div className="flex items-center justify-between gap-2 mb-2 p-2 px-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="leading-tight text-[11.5px]">{attachmentError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachmentError(null)}
            className="p-1 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Vision Warning Banner if image attached to non-vision model */}
      {hasImage && !isSelectedVisionCapable && (
        <div className="flex items-center gap-2 mb-2 p-2 px-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs shadow-xs animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="leading-tight text-[11.5px]">
            {language === "fa" ? (
              <>مدل <strong className="font-mono">{selectedModel}</strong> ممکن است از ورودی تصویری پشتیبانی نکند.</>
            ) : (
              <>Model <strong className="font-mono">{selectedModel}</strong> may not support image input.</>
            )}
          </span>
        </div>
      )}

      {/* Single Continuous Outer Container */}
      <div className="relative bg-[var(--composer-bg,var(--bg-surface,#1f212a))] border border-[var(--composer-border,var(--border-color,#282a36))] hover:border-[var(--composer-hover-border,var(--border-color,#3b3e4f))] focus-within:border-[var(--composer-focus-border,var(--accent-color,#818cf8))] focus-within:ring-2 focus-within:ring-[var(--composer-focus-border,var(--accent-color,#818cf8))]/15 rounded-2xl sm:rounded-[20px] p-2 sm:p-2.5 transition-all duration-150 shadow-sm">
        {/* Attachments Preview Row */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2 mb-2 border-b border-[var(--border-subtle,#1e2029)]">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="relative group flex items-center gap-2 p-1 pr-1.5 rtl:pr-1 rtl:pl-1.5 rounded-xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-primary,#e6e9f0)] shadow-xs"
              >
                {file.isImage && file.dataUrl ? (
                  <div
                    onClick={() => setPreviewAttachment(file)}
                    className="relative cursor-pointer group/img"
                    title={language === "fa" ? "مشاهده تصویر بزرگ‌تر" : "Click to inspect large image"}
                  >
                    <img
                      src={file.dataUrl}
                      alt={file.name}
                      className="w-9 h-9 object-cover rounded-lg border border-[var(--border-subtle,#1e2029)] group-hover/img:brightness-110 transition-all"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                      <Eye className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      if (file.textContent) setPreviewAttachment(file);
                    }}
                    className="w-9 h-9 rounded-lg bg-[var(--btn-bg,#1c1e27)] flex items-center justify-center text-[var(--accent-color,#818cf8)] cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                )}

                <div
                  className="flex flex-col text-left rtl:text-right max-w-[120px] cursor-pointer"
                  onClick={() => setPreviewAttachment(file)}
                >
                  <span className="font-medium truncate text-[11px] hover:underline">{file.name}</span>
                  <span className="text-[9.5px] text-[var(--text-muted,#6b7280)] font-mono">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>

                {/* Actions: Replace & Remove */}
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => handleStartReplaceAttachment(file.id)}
                    className="p-1 rounded-md hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
                    title={language === "fa" ? "جایگزینی فایل" : "Replace file"}
                    aria-label="Replace attachment"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(file.id)}
                    className="p-1 rounded-md hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-rose-400 transition-colors cursor-pointer"
                    title={language === "fa" ? "حذف پیوست" : "Remove attachment"}
                    aria-label="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Direct Image Mode Active Indicator */}
        {isDirectImageMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded-xl bg-[var(--bg-secondary,#1c1e27)] border border-[var(--border-color,#282a36)] text-[var(--text-primary,#e6e9f0)] text-xs font-mono shadow-xs w-fit animate-fadeIn">
            <ImageIcon className="w-3.5 h-3.5 text-[var(--text-secondary,#9ba3b2)] shrink-0" />
            <span>{t("generateImage")}</span>
            <button
              type="button"
              onClick={() => setIsDirectImageMode(false)}
              className="p-0.5 hover:text-white rounded transition-colors cursor-pointer ml-1 text-[var(--text-muted,#777)] hover:text-[var(--text-primary,#e6e9f0)]"
              title="Cancel direct image mode"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className={`w-full transition-all duration-150 ${isMultiline ? "flex flex-col gap-1.5" : "flex items-center gap-1.5 sm:gap-2"}`}>
          {/* Start: Add File Button in Single-line mode */}
          {!isMultiline && renderAddFileButton()}

          {/* Persistent Textarea - Single DOM node, never unmounted */}
          <textarea
            key="chat-composer-persistent-input"
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            dir={inputIsRtl ? "rtl" : "ltr"}
            placeholder={
              placeholder !== undefined
                ? placeholder
                : isDirectImageMode
                ? t("directImagePlaceholder")
                : t("sendMessagePlaceholder")
            }
            rows={1}
            className={`${
              isMultiline
                ? "w-full min-h-[44px] max-h-48 px-2 py-1"
                : "flex-1 px-2 py-0.5"
            } bg-transparent text-[var(--composer-text,var(--text-primary,#e6e9f0))] placeholder-[var(--composer-placeholder,var(--text-muted,#6b7280))]/70 text-[14.5px] sm:text-[15px] leading-[22px] focus:outline-none focus:ring-0 border-0 resize-none overflow-y-auto custom-scrollbar block transition-[height] duration-100 ease-out ${
              inputIsRtl ? "font-vazir text-right" : "font-latin text-left"
            }`}
          />

          {/* Multiline mode: bottom controls toolbar */}
          {isMultiline ? (
            <div className="flex items-center justify-between pt-1">
              {renderAddFileButton()}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {renderThinkingButton()}
                {renderSendButton()}
              </div>
            </div>
          ) : (
            /* Single-line mode: trailing actions */
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {renderThinkingButton()}
              {renderSendButton()}
            </div>
          )}
        </div>
      </div>

      {/* Attachment Inspection Modal (Before Sending) */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fadeIn select-none"
          onClick={() => setPreviewAttachment(null)}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-4xl flex items-center justify-between py-2 px-4 rounded-2xl bg-neutral-900/90 border border-neutral-700/60 z-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-semibold text-xs sm:text-sm text-white truncate">
                {previewAttachment.name}
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                ({(previewAttachment.size / 1024).toFixed(1)} KB)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStartReplaceAttachment(previewAttachment.id)}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Replace with another file"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{language === "fa" ? "جایگزینی" : "Replace"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(previewAttachment.id)}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
                <span>{language === "fa" ? "حذف" : "Remove"}</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Inspection Stage */}
          <div
            className="flex-1 w-full max-w-4xl flex items-center justify-center p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {previewAttachment.isImage && previewAttachment.dataUrl ? (
              <img
                src={previewAttachment.dataUrl}
                alt={previewAttachment.name}
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
              />
            ) : (
              <div className="w-full max-h-[70vh] p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-mono overflow-y-auto whitespace-pre-wrap">
                {previewAttachment.textContent || "Binary document content"}
              </div>
            )}
          </div>

          {/* Bottom Hint */}
          <div className="text-[11px] font-mono text-neutral-400 py-1">
            {language === "fa"
              ? "پیوست آماده ارسال است • کلیک در خارج برای بستن"
              : "Attachment pending submission • Click outside or Esc to close"}
          </div>
        </div>
      )}
    </div>
  );
};
