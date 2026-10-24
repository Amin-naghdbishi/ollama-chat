import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Bot,
  User,
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
  Image as ImageIcon,
  X,
  Play,
  CheckCircle,
  AlertTriangle,
  Zap,
  Clock,
  BarChart2,
} from "lucide-react";
import { ChatMessage, FileAttachment, AIActivityState } from "../types";
import { CodeBlock } from "./CodeBlock";
import { AIStatusIndicator } from "./AIStatusIndicator";
import { Language, getTranslation, isRtlText } from "../lib/i18n";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onContinue?: (messageId: string) => void;
  onFinish?: (messageId: string) => void;
  isLastAssistantMessage?: boolean;
  isStreaming?: boolean;
  activeActivityState?: AIActivityState;
  language?: Language;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRetry,
  onEdit,
  onDelete,
  onContinue,
  onFinish,
  isLastAssistantMessage,
  isStreaming,
  activeActivityState,
  language = "en",
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(
    message.isThinkingOpen ?? true
  );
  const [showStatsDetails, setShowStatsDetails] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUserExpanded, setIsUserExpanded] = useState(false);
  const [isLongUserMsg, setIsLongUserMsg] = useState(false);
  const userContentRef = useRef<HTMLDivElement>(null);

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
        if (height > 280) {
          setIsLongUserMsg(true);
        } else {
          setIsLongUserMsg(false);
        }
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex gap-3.5 sm:gap-4 px-2 sm:px-4 py-3 my-1.5 transition-colors ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
          isUser
            ? "bg-[var(--btn-bg,#1c1e27)] border-[var(--border-color,#282a36)] text-[var(--text-primary,#e6e9f0)]"
            : "bg-[var(--accent-color,#818cf8)] border-[var(--accent-color,#818cf8)] text-white font-bold text-[11px]"
        }`}
      >
        {isUser ? <User className="w-4 h-4 text-[var(--text-primary,#e6e9f0)]" /> : <span>AI</span>}
      </div>

      {/* Message Body Container */}
      <div className={`flex flex-col ${isUser ? "items-end max-w-[90%] sm:max-w-[85%] md:max-w-[80%]" : "items-start w-full max-w-full"}`}>
        {/* Header meta */}
        <div className="flex items-center gap-2 mb-1.5 text-[11.5px] text-[var(--text-muted,#6b7280)] font-medium">
          <span>{isUser ? (language === "fa" ? "شما" : "You") : (language === "fa" ? "دستیار هوش مصنوعی" : "Assistant")}</span>
          {message.modelUsed && !isUser && (
            <span className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)] text-[var(--accent-color,#818cf8)] font-mono text-[10.5px]">
              {message.modelUsed}
            </span>
          )}
          <span>•</span>
          <span className="font-mono text-[10.5px]">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* User Attached Files Preview */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mb-2.5">
            {message.attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2.5 p-2 pr-3 rounded-xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)] text-xs text-[var(--text-secondary,#9ba3b2)] shadow-xs"
              >
                {file.isImage && file.dataUrl ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    onClick={() => setPreviewImage(file.dataUrl!)}
                    className="w-12 h-12 object-cover rounded-lg cursor-pointer border border-[var(--border-subtle,#1e2029)] hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-surface,#1f212a)] flex items-center justify-center text-[var(--accent-color,#818cf8)]">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-col text-left rtl:text-right">
                  <span className="font-medium text-[var(--text-primary,#e6e9f0)] truncate max-w-[160px] text-xs">
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
          <div className="w-full mb-3.5 rounded-2xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)] overflow-hidden text-xs shadow-xs">
            <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="w-full flex items-center justify-between p-3.5 text-[11.5px] uppercase tracking-wider text-[var(--text-muted,#6b7280)] font-bold cursor-pointer hover:bg-[var(--bg-surface,#1f212a)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[var(--accent-color,#818cf8)] animate-pulse" />
                <span>{t("thinkingProcess")}</span>
                {message.thinkingTimeMs && (
                  <span className="text-[10.5px] text-[var(--text-muted,#6b7280)] font-mono bg-[var(--bg-primary,#131418)] px-2 py-0.5 rounded-md">
                    {(message.thinkingTimeMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {isThinkingExpanded ? (
                <ChevronDown className="w-4 h-4 text-[var(--text-muted,#6b7280)]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[var(--text-muted,#6b7280)] rtl:rotate-180" />
              )}
            </button>
            {isThinkingExpanded && (
              <div
                dir={isRtlText(message.thinkingContent) ? "rtl" : "ltr"}
                className="px-4 pb-4 pt-3 text-[13.5px] text-[var(--text-secondary,#9ba3b2)] italic leading-[1.75] border-t border-[var(--border-subtle,#1e2029)]"
              >
                {message.thinkingContent}
              </div>
            )}
          </div>
        )}

        {/* Non-destructive Thinking Warning Banner */}
        {!isUser && message.thinkingWarning && (
          <div className="w-full mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-relaxed">{message.thinkingWarning}</span>
          </div>
        )}

        {/* Message Content Bubble / Container */}
        {isEditing ? (
          <div className="w-full flex flex-col gap-3 p-4 bg-[var(--bg-surface,#1f212a)] rounded-2xl border border-[var(--border-color,#282a36)] shadow-xl animate-fadeIn transition-all">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              dir={isRtl ? "rtl" : "ltr"}
              placeholder="Type your edited message..."
              className="w-full bg-[var(--bg-primary,#131418)] text-[var(--text-primary,#e6e9f0)] p-3.5 rounded-xl border border-[var(--border-color,#282a36)] text-[15px] focus:outline-none focus:border-[var(--accent-color,#818cf8)] resize-none overflow-y-auto leading-[1.75] max-h-[460px]"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[var(--text-muted,#6b7280)] font-mono hidden sm:inline">
                Ctrl + Enter to save • Esc to cancel
              </span>
              <div className="flex items-center gap-2.5 ml-auto rtl:ml-0 rtl:mr-auto">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-bg,#1c1e27)] transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4.5 py-2 rounded-xl text-xs bg-[var(--accent-color,#818cf8)] hover:brightness-110 text-white font-bold shadow-xs transition-all cursor-pointer"
                >
                  {t("saveAndResend")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`transition-all ${
              isUser
                ? "bg-[var(--bg-user-msg,#222530)] border border-[var(--border-color,#313547)] px-5 py-3.5 rounded-2xl rounded-tr-none rtl:rounded-tr-2xl rtl:rounded-tl-none text-[var(--text-primary,#f3f4f6)] text-[15px] sm:text-[15.5px] leading-[1.75] shadow-sm max-w-full"
                : "w-full text-[var(--text-primary,#f3f4f6)] text-[15px] sm:text-[15.5px] leading-[1.75] space-y-3"
            }`}
          >
            {message.isError ? (
              <div className="text-[var(--color-error,#f87171)] flex flex-col gap-1.5 p-3 rounded-xl bg-red-950/40 border border-red-800/60">
                <span className="font-semibold text-xs uppercase tracking-wider">
                  {t("errorGenerating")}
                </span>
                <span className="text-xs text-[var(--color-error,#f87171)] opacity-90 leading-relaxed">
                  {message.errorMessage || message.content}
                </span>
              </div>
            ) : isUser ? (
              <div className="w-full">
                <div
                  ref={userContentRef}
                  dir={isRtl ? "rtl" : "ltr"}
                  className={`whitespace-pre-wrap break-words text-[15px] sm:text-[15.5px] leading-[1.75] transition-all relative ${
                    isLongUserMsg && !isUserExpanded
                      ? "max-h-[260px] overflow-hidden"
                      : "max-h-none"
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
                    className="mt-2.5 w-full pt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--accent-color,#818cf8)] hover:brightness-125 transition-colors cursor-pointer border-t border-[var(--border-subtle,#1e2029)]/80"
                  >
                    <span>{isUserExpanded ? t("showLess") : t("showMore")}</span>
                    {isUserExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            ) : !message.content && !message.thinkingContent && (message.isStreaming || isStreaming) ? (
              <div className="py-2 animate-fadeIn">
                <AIStatusIndicator
                  activityState={message.activityState || activeActivityState || "generating"}
                  language={language}
                  variant="bubble"
                />
              </div>
            ) : (
              <div
                dir={isRtl ? "rtl" : "ltr"}
                className="markdown-body max-w-none text-[var(--text-primary,#f3f4f6)] text-[15px] sm:text-[15.5px] leading-[1.75] space-y-3.5 break-words"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-([\w+#.-]+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");
                      const isMultiLine = String(children).includes("\n");
                      const isBlock = match || isMultiLine || (!inline && className?.includes("language-"));

                      if (isBlock) {
                        return (
                          <CodeBlock
                            language={match ? match[1] : ""}
                            value={codeString}
                          />
                        );
                      }
                      return (
                        <code
                          dir="ltr"
                          className="px-1.5 py-0.5 rounded-md bg-[var(--code-inline-bg)] text-[var(--code-inline-text)] font-mono text-[13px] border border-[var(--border-subtle)] font-medium inline-block my-0.5 align-baseline"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    h1({ children }) {
                      return (
                        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary,#f4f4f5)] border-b border-[var(--border-color,#27272a)] pb-2 mt-6 mb-3.5">
                          {children}
                        </h1>
                      );
                    },
                    h2({ children }) {
                      return (
                        <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary,#f4f4f5)] mt-5 mb-3">
                          {children}
                        </h2>
                      );
                    },
                    h3({ children }) {
                      return (
                        <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary,#e4e4e7)] mt-4 mb-2">
                          {children}
                        </h3>
                      );
                    },
                    p({ children }) {
                      return (
                        <p className="leading-[1.75] text-[var(--text-primary,#e4e4e7)] text-[15px] sm:text-[15.5px] mb-3">
                          {children}
                        </p>
                      );
                    },
                    ul({ children }) {
                      return (
                        <ul className="list-disc list-outside pl-6 rtl:pr-6 rtl:pl-0 space-y-1.5 my-3 text-[var(--text-primary,#e4e4e7)] text-[15px] sm:text-[15.5px] leading-[1.75]">
                          {children}
                        </ul>
                      );
                    },
                    ol({ children }) {
                      return (
                        <ol className="list-decimal list-outside pl-6 rtl:pr-6 rtl:pl-0 space-y-1.5 my-3 text-[var(--text-primary,#e4e4e7)] text-[15px] sm:text-[15.5px] leading-[1.75]">
                          {children}
                        </ol>
                      );
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-4 rtl:border-r-4 rtl:border-l-0 border-[var(--accent-color,#818cf8)] pl-4 rtl:pr-4 rtl:pl-0 py-1.5 my-3.5 text-[var(--text-secondary,#a1a1aa)] italic bg-[var(--bg-surface,#18181b)] rounded-r-xl rtl:rounded-l-xl rtl:rounded-r-none text-[14.5px] leading-[1.75]">
                          {children}
                        </blockquote>
                      );
                    },
                    table({ children }) {
                      return (
                        <div dir="ltr" className="overflow-x-auto my-4 rounded-xl border border-[var(--border-color,#27272a)] bg-[var(--code-bg,#09090b)] custom-scrollbar">
                          <table className="min-w-full divide-y divide-[var(--border-color,#27272a)] text-xs font-mono">
                            {children}
                          </table>
                        </div>
                      );
                    },
                    th({ children }) {
                      return (
                        <th className="px-4 py-3 bg-[var(--code-header-bg,#18181b)] text-left font-semibold text-[var(--text-primary,#f4f4f5)] uppercase text-[11px] tracking-wider">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return (
                        <td className="px-4 py-2.5 border-t border-[var(--border-color,#27272a)] text-[var(--text-primary,#d4d4d8)] text-xs">
                          {children}
                        </td>
                      );
                    },
                    hr() {
                      return <hr className="border-[var(--border-color,#27272a)] my-5" />;
                    },
                    a({ href, children }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--link-color,#818cf8)] hover:underline font-medium"
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>

                {/* Subtle dynamic indicator while streaming content */}
                {(message.isStreaming || isStreaming) && (
                  <div className="pt-2">
                    <AIStatusIndicator
                      activityState={message.activityState || activeActivityState || "generating"}
                      language={language}
                      variant="inline"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interrupted Generation Notice & Continue / Finish Controls */}
        {!isUser && message.isInterrupted && !isStreaming && (
          <div className="w-full mt-3 p-3.5 rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn shadow-xs">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{t("generationStopped")}</span>
            </div>

            <div className="flex items-center gap-2">
              {onContinue && (
                <button
                  onClick={() => onContinue(message.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t("continueResponse")}</span>
                </button>
              )}

              {onFinish && (
                <button
                  onClick={() => onFinish(message.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)]" />
                  <span>{t("finishResponse")}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lightweight Generation Stats Footer */}
        {!isUser && message.generationStats && !message.isStreaming && (
          <div className="mt-2 text-[11px] text-[var(--text-muted,#6b7280)] font-mono">
            <button
              onClick={() => setShowStatsDetails(!showStatsDetails)}
              className="flex items-center gap-2 hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {message.generationStats.tokensPerSec
                  ? `${message.generationStats.tokensPerSec} ${t("tokSec")}`
                  : `${message.generationStats.answerTokens || 0} ${t("tokens")}`}
              </span>
              <span>•</span>
              <span>
                {message.generationStats.totalDurationMs
                  ? `${(message.generationStats.totalDurationMs / 1000).toFixed(1)}s`
                  : "Complete"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showStatsDetails ? "rotate-180" : ""}`}
              />
            </button>

            {showStatsDetails && (
              <div className="mt-2 p-3 rounded-xl bg-[var(--bg-secondary,#191a21)] border border-[var(--border-subtle,#1e2029)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[var(--text-secondary,#9ba3b2)] text-[11px] animate-fadeIn shadow-xs">
                <div>
                  <span className="text-[var(--text-muted,#6b7280)] block">{t("speed")}:</span>
                  <span className="text-[var(--text-primary,#e6e9f0)] font-bold">{message.generationStats.tokensPerSec || 0} t/s</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted,#6b7280)] block">{t("answerTokens")}:</span>
                  <span className="text-[var(--text-primary,#e6e9f0)] font-bold">{message.generationStats.answerTokens || 0}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted,#6b7280)] block">{t("thinkingTokens")}:</span>
                  <span className="text-[var(--text-primary,#e6e9f0)] font-bold">{message.generationStats.thinkingTokens || 0}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted,#6b7280)] block">{t("promptTokens")}:</span>
                  <span className="text-[var(--text-primary,#e6e9f0)] font-bold">{message.generationStats.promptEvalCount || 0}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Actions Bar */}
        {!isEditing && (
          <div
            className={`flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            <button
              onClick={handleCopyMessage}
              className="p-1.5 rounded-lg hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
              title={t("copyMessage")}
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium text-[11px]">{t("copied")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{t("copyText")}</span>
                </>
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
                className="p-1.5 rounded-lg hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
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

      {/* Image Modal Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 p-2 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 rtl:right-auto rtl:left-3 p-1.5 rounded-full bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
