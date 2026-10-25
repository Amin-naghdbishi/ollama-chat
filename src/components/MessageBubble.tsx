import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Copy,
  Check,
  RotateCw,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Brain,
  FileText,
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import { ChatMessage, AIActivityState } from "../types";
import { CodeBlock } from "./CodeBlock";
import { AIStatusIndicator } from "./AIStatusIndicator";
import { ImageViewerModal } from "./ImageViewerModal";
import { Language, getTranslation, isRtlText } from "../lib/i18n";
import { FileAttachment } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onContinue?: (messageId: string) => void;
  onFinish?: (messageId: string) => void;
  onRetryImage?: (messageId: string) => void;
  onStopImage?: (messageId: string) => void;
  isLastAssistantMessage?: boolean;
  isStreaming?: boolean;
  activeActivityState?: AIActivityState;
  language?: Language;
  selectedModel?: string | null;
  onApplyImageEdit?: (params: {
    sourceMessageId?: string;
    sourceImageUrl: string;
    sourceVersionId?: string;
    sourceTitle?: string;
    editInstruction: string;
    referenceImages?: FileAttachment[];
  }) => Promise<string | null>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRetry,
  onEdit,
  onDelete,
  onRetryImage,
  onStopImage,
  isLastAssistantMessage,
  isStreaming,
  language = "en",
  selectedModel,
  onApplyImageEdit,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(message.isThinkingOpen ?? true);
  const [isUserExpanded, setIsUserExpanded] = useState(false);
  const [isLongUserMsg, setIsLongUserMsg] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  const userContentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);
  const isUser = message.role === "user";
  const isRtl = isRtlText(message.content) || (language === "fa" && isRtlText(message.content));

  useEffect(() => {
    if (isUser) {
      const lineCount = (message.content || "").split("\n").length;
      if (lineCount > 10) {
        setIsLongUserMsg(true);
      } else if (userContentRef.current) {
        const height = userContentRef.current.scrollHeight;
        setIsLongUserMsg(height > 280);
      } else {
        setIsLongUserMsg(false);
      }
    }
  }, [message.content, isUser]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadImage = (url: string, filename?: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `comfyui-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Auto-grow and focus logic for message editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 460)}px`;
    }
  }, [isEditing]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 460)}px`;
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const hasDefensibleProgress =
    typeof message.imageGeneration?.progress === "number" &&
    message.imageGeneration.progress > 0;

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex px-2 sm:px-4 py-2.5 my-1 transition-colors ${
        isUser ? "justify-end" : "justify-start w-full"
      }`}
    >
      {/* Message Body Container (Simplified: No AI avatar box, No redundant labels) */}
      <div
        className={`flex flex-col ${
          isUser
            ? "items-end max-w-[88%] sm:max-w-[80%] md:max-w-[75%]"
            : "items-start w-full max-w-full"
        }`}
      >
        {/* User Attached Files Preview */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)] text-xs text-[var(--text-secondary,#9ba3b2)] shadow-xs"
              >
                {file.isImage && file.dataUrl ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    onClick={() => setViewerImageUrl(file.dataUrl!)}
                    className="w-10 h-10 object-cover rounded-lg cursor-pointer border border-[var(--border-subtle,#1e2029)] hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface,#1f212a)] flex items-center justify-center text-[var(--accent-color,#818cf8)]">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col text-left rtl:text-right">
                  <span className="font-medium text-[var(--text-primary,#e6e9f0)] truncate max-w-[140px] text-xs">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reasoning / Thinking Process Block (For Assistant) */}
        {!isUser && message.thinkingContent && (
          <div className="w-full mb-3 rounded-2xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)] overflow-hidden text-xs shadow-xs">
            <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="w-full flex items-center justify-between p-3 text-[11.5px] uppercase tracking-wider text-[var(--text-muted,#6b7280)] font-bold cursor-pointer hover:bg-[var(--bg-surface,#1f212a)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] animate-pulse" />
                <span>{t("thinkingProcess")}</span>
                {message.thinkingTimeMs && (
                  <span className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono bg-[var(--bg-primary,#131418)] px-1.5 py-0.5 rounded">
                    {(message.thinkingTimeMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {isThinkingExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] rtl:rotate-180" />
              )}
            </button>
            {isThinkingExpanded && (
              <div
                dir={isRtlText(message.thinkingContent) ? "rtl" : "ltr"}
                className="px-3.5 pb-3.5 pt-2 text-[13px] text-[var(--text-secondary,#9ba3b2)] italic leading-relaxed border-t border-[var(--border-subtle,#1e2029)]"
              >
                {message.thinkingContent}
              </div>
            )}
          </div>
        )}

        {/* User Message Editing Mode */}
        {isEditing ? (
          <div className="w-full flex flex-col gap-2.5 p-3.5 bg-[var(--bg-surface,#1f212a)] rounded-2xl border border-[var(--border-color,#282a36)] shadow-xl animate-fadeIn transition-all">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              dir={isRtl ? "rtl" : "ltr"}
              placeholder="Edit your message..."
              className="w-full bg-[var(--bg-primary,#131418)] text-[var(--text-primary,#e6e9f0)] p-3 rounded-xl border border-[var(--border-color,#282a36)] text-[14.5px] focus:outline-none focus:border-[var(--accent-color,#818cf8)] resize-none overflow-y-auto leading-relaxed max-h-[460px]"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[var(--text-muted,#6b7280)] font-mono hidden sm:inline">
                Ctrl + Enter to save • Esc to cancel
              </span>
              <div className="flex items-center gap-2 ml-auto rtl:ml-0 rtl:mr-auto">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-bg,#1c1e27)] transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-xl text-xs bg-[var(--accent-color,#818cf8)] hover:brightness-110 text-white font-bold shadow-xs transition-all cursor-pointer"
                >
                  {t("saveAndResend")}
                </button>
              </div>
            </div>
          </div>
        ) : isUser ? (
          /* User Message Bubble */
          <div className="bg-[var(--bg-user-msg,#222530)] border border-[var(--border-color,#313547)] px-4.5 py-3 rounded-2xl rounded-tr-sm rtl:rounded-tr-2xl rtl:rounded-tl-sm text-[var(--text-primary,#f3f4f6)] text-[14.5px] sm:text-[15px] leading-relaxed shadow-sm">
            {/* Reply / Reference indicator above message if this is an image edit request */}
            {message.imageEditReference && (
              <div
                className="flex items-center gap-2.5 mb-2.5 p-1.5 px-2.5 rounded-xl bg-black/30 border-l-2 rtl:border-l-0 rtl:border-r-2 border-[var(--accent-color,#818cf8)] border border-white/10 text-xs shadow-xs"
              >
                <img
                  src={message.imageEditReference.sourceImageUrl}
                  alt="Source"
                  className="w-10 h-10 object-cover rounded-lg border border-white/20 cursor-pointer hover:opacity-85 transition-opacity shrink-0"
                  onClick={() => setViewerImageUrl(message.imageEditReference!.sourceImageUrl)}
                  title="Click to view source visual"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent-color,#818cf8)]">
                    <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === "fa" ? "ویرایش بر روی تصویر" : "Editing image"}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted,#9ca3af)] truncate font-mono">
                    {message.imageEditReference.sourceTitle || "Source visual"}
                  </span>
                </div>
              </div>
            )}

            <div
              ref={userContentRef}
              dir={isRtl ? "rtl" : "ltr"}
              className={`whitespace-pre-wrap break-words transition-all relative ${
                isLongUserMsg && !isUserExpanded ? "max-h-[260px] overflow-hidden" : "max-h-none"
              }`}
            >
              {message.content}
              {isLongUserMsg && !isUserExpanded && (
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--bg-user-msg,#222530)] to-transparent pointer-events-none" />
              )}
            </div>
            {isLongUserMsg && (
              <button
                type="button"
                onClick={() => setIsUserExpanded(!isUserExpanded)}
                className="mt-2 w-full pt-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--accent-color,#818cf8)] hover:brightness-125 transition-colors cursor-pointer border-t border-[var(--border-subtle,#1e2029)]/80"
              >
                <span>{isUserExpanded ? t("showLess") : t("showMore")}</span>
                {isUserExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        ) : !isUser && message.imageGeneration ? (
          /* ==========================================================================
             IMAGE GENERATION CARD: Adapts cleanly to actual aspect ratio (Square, Portrait, Landscape)
             ========================================================================== */
          (() => {
            const genWidth = message.imageGeneration.width || 512;
            const genHeight = message.imageGeneration.height || 512;
            const aspect = genWidth / genHeight;
            const containerWidthClass =
              aspect > 1.15
                ? "w-80 sm:w-[380px] max-w-full"
                : aspect < 0.85
                ? "w-60 sm:w-68 max-w-full"
                : "w-72 sm:w-80 max-w-full";

            return (
              <div className="flex flex-col items-start space-y-1.5 animate-fadeIn">
                {/* Minimal Heading Above Container Aligned with Percentage */}
                <div className={`flex items-center justify-between ${containerWidthClass} px-1 text-xs font-medium text-[var(--text-secondary,#9ba3b2)]`}>
                  <span>
                    {message.imageGeneration.status === "completed"
                      ? language === "fa"
                        ? "تصویر تولید شده"
                        : "Generated image"
                      : message.imageGeneration.status === "failed"
                      ? language === "fa"
                        ? "خطا در تولید تصویر"
                        : "Generation failed"
                      : language === "fa"
                      ? "در حال تولید تصویر"
                      : "Generating image"}
                  </span>

                  {/* Progress Percentage only shown when defensible numerical progress exists */}
                  {hasDefensibleProgress && (
                    <span className="font-mono text-xs font-semibold text-[var(--accent-color,#818cf8)]">
                      {message.imageGeneration.progress}%
                    </span>
                  )}
                </div>

                {/* Adaptive Aspect-Ratio Container (Same dimensions throughout generation & completion to prevent shifts) */}
                <div
                  className={`${containerWidthClass} rounded-2xl overflow-hidden relative shadow-md bg-neutral-950 flex items-center justify-center`}
                  style={{ aspectRatio: `${genWidth} / ${genHeight}` }}
                >
                  {message.imageGeneration.status === "completed" && message.imageGeneration.imageUrl ? (
                    /* Completed State: Real Generated Image In Same Aspect Ratio */
                    <img
                      src={message.imageGeneration.imageUrl}
                      alt="Generated visual output"
                      className="w-full h-full object-contain cursor-pointer rounded-2xl hover:opacity-95 transition-opacity"
                      onClick={() => setViewerImageUrl(message.imageGeneration!.imageUrl!)}
                    />
                  ) : (
                    /* Generating State: ONLY softly animated, flowing colors */
                    <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#12072b] via-[#080a14] to-[#041a20]">
                      {/* Floating color 1 radial glow */}
                      <div
                        className="absolute -top-10 -left-10 w-52 h-52 rounded-full blur-3xl animate-flow-1"
                        style={{ backgroundColor: "var(--image-gen-color-1, #9333ea)", opacity: 0.45 }}
                      />
                      {/* Floating color 2 radial glow */}
                      <div
                        className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full blur-3xl animate-flow-2"
                        style={{ backgroundColor: "var(--image-gen-color-2, #2563eb)", opacity: 0.45 }}
                      />
                      {/* Floating color 3 radial glow */}
                      <div
                        className="absolute top-1/4 left-1/4 w-44 h-44 rounded-full blur-3xl animate-flow-3"
                        style={{ backgroundColor: "var(--image-gen-color-3, #06b6d4)", opacity: 0.4 }}
                      />
                      {/* Floating accent blending */}
                      <div
                        className="absolute bottom-1/4 left-1/3 w-36 h-36 rounded-full blur-2xl animate-flow-4"
                        style={{ backgroundColor: "var(--image-gen-color-1, #9333ea)", opacity: 0.35 }}
                      />
                    </div>
                  )}
                </div>

                {/* Metadata & Controls Below Container */}
                <div className={`${containerWidthClass} px-1 pt-1 space-y-1 text-[11px] text-[var(--text-muted,#777)] font-mono`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="truncate max-w-[210px] text-[var(--text-secondary,#aaa)] font-medium" title={message.imageGeneration.modelUsed}>
                      {message.imageGeneration.modelUsed || "ComfyUI Checkpoint"}
                    </span>
                    <span className="text-neutral-500 shrink-0">{genWidth} × {genHeight}</span>
                  </div>

                  {/* Graceful Limitation Explanation / Fallback Notice */}
                  {message.imageGeneration.warning && (
                    <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[10.5px] font-sans leading-relaxed">
                      {message.imageGeneration.warning}
                    </div>
                  )}

                  {message.imageGeneration.enhancedPrompt && (
                    <p className="text-[11px] text-[var(--text-muted,#888)] italic line-clamp-2 leading-relaxed">
                      {message.imageGeneration.enhancedPrompt}
                    </p>
                  )}

                  {/* Action Buttons for Completed State */}
                  {message.imageGeneration.status === "completed" && message.imageGeneration.imageUrl && (
                    <div className="flex items-center gap-2 pt-1 font-sans">
                      <button
                        onClick={() =>
                          handleDownloadImage(
                            message.imageGeneration!.imageUrl!,
                            `comfyui-${message.imageGeneration?.modelUsed || "gen"}-${Date.now()}.png`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-primary,#eee)] text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      {onRetryImage && (
                        <button
                          onClick={() => onRetryImage(message.id)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] text-[var(--text-primary,#eee)] text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Honest Failure Notice & Retry */}
                  {message.imageGeneration.status === "failed" && (
                    <div className="pt-1 text-red-400 space-y-1 font-sans">
                      <p className="text-[11.5px] leading-relaxed">
                        {message.imageGeneration.error || "Generation failed. Verify ComfyUI connection and selected checkpoint."}
                      </p>
                      {onRetryImage && (
                        <button
                          onClick={() => onRetryImage(message.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-200 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Retry generation</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          /* Regular Assistant Text Response */
          <div className="w-full text-[var(--text-primary,#f3f4f6)] text-[14.5px] sm:text-[15px] leading-relaxed space-y-3">
            {message.isError ? (
              <div className="text-[var(--color-error,#f87171)] flex flex-col gap-1.5 p-3 rounded-xl bg-red-950/40 border border-red-800/60">
                <span className="font-semibold text-xs uppercase tracking-wider">
                  {t("errorGenerating")}
                </span>
                <span className="text-xs text-[var(--color-error,#f87171)] opacity-90 leading-relaxed">
                  {message.errorMessage || message.content}
                </span>
              </div>
            ) : (
              <div
                dir={isRtl ? "rtl" : "ltr"}
                className="markdown-body prose dark:prose-invert max-w-none break-words leading-relaxed"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match && !String(children).includes("\n");

                      if (isInline) {
                        return (
                          <code
                            className="bg-[var(--bg-secondary,#1c1e27)] text-[var(--accent-color,#818cf8)] font-mono text-[13px] px-1.5 py-0.5 rounded-md border border-[var(--border-subtle,#262834)]"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }

                      return (
                        <CodeBlock
                          language={match ? match[1] : "text"}
                          value={String(children).replace(/\n$/, "")}
                        />
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Message Actions Bar on Hover (Preserving all actions) */}
        {!isEditing && (
          <div
            className={`flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            <button
              onClick={handleCopyMessage}
              className="p-1.5 rounded-lg hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1 text-xs cursor-pointer"
              title={t("copyMessage")}
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px] font-medium">{t("copied")}</span>
                </>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {isUser && onEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
                title={t("editMessage")}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {!isUser && onRetry && isLastAssistantMessage && !isStreaming && (
              <button
                onClick={() => onRetry(message.id)}
                className="p-1.5 rounded-lg hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-emerald-400 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                title={t("regenerateResponse")}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="text-[11px]">{t("regenerateResponse")}</span>
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1.5 rounded-lg hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-rose-400 transition-colors cursor-pointer"
                title={t("deleteMessage")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dedicated Full-featured Image Viewer and Editor Modal */}
      {viewerImageUrl && (
        <ImageViewerModal
          imageUrl={viewerImageUrl}
          rootImageId={message.id}
          sourceMessageId={message.id}
          title={message.imageGeneration?.modelUsed || message.attachments?.[0]?.name || "Image Workspace"}
          onClose={() => setViewerImageUrl(null)}
          onDownload={() =>
            handleDownloadImage(viewerImageUrl, `image-${Date.now()}.png`)
          }
          onApplyEdit={
            onApplyImageEdit
              ? (params) =>
                  onApplyImageEdit({
                    sourceMessageId: message.id,
                    sourceImageUrl: params.sourceImageUrl,
                    sourceVersionId: params.sourceVersionId,
                    sourceTitle: params.sourceTitle,
                    editInstruction: params.editInstruction,
                    referenceImages: params.referenceImages,
                  })
              : undefined
          }
          selectedModel={message.imageGeneration?.modelUsed || selectedModel}
          language={language}
        />
      )}
    </div>
  );
};
