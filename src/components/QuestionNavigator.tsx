import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { ChatMessage } from "../types";
import { Language, isRtlText } from "../lib/i18n";

interface QuestionNavigatorProps {
  messages: ChatMessage[];
  activeMessageId: string | null;
  onSelectQuestion: (messageId: string) => void;
  language?: Language;
}

interface QuestionItem {
  id: string;
  index: number;
  content: string;
  firstLine: string;
  hasAttachments: boolean;
}

const MAX_VISIBLE_MARKERS = 15;
const VISIBLE_PREVIEW_ITEMS_HEIGHT = 380; // fits ~13 questions before scrolling

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  messages,
  activeMessageId,
  onSelectQuestion,
  language = "en",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // Extract all user questions from messages
  const userQuestions: QuestionItem[] = React.useMemo(() => {
    return messages
      .filter((m) => m.role === "user")
      .map((m, idx) => {
        const rawContent = m.content.trim();
        let firstLine = rawContent.split("\n")[0] || "";
        if (!firstLine && m.attachments && m.attachments.length > 0) {
          firstLine = language === "fa" ? "📎 پیوست تصویر/فایل" : "📎 Attached file/image";
        }
        if (!firstLine) {
          firstLine = language === "fa" ? `پرسش ${idx + 1}` : `Question ${idx + 1}`;
        }
        return {
          id: m.id,
          index: idx + 1,
          content: rawContent,
          firstLine,
          hasAttachments: !!(m.attachments && m.attachments.length > 0),
        };
      });
  }, [messages, language]);

  if (userQuestions.length === 0) {
    return null;
  }

  // Active question calculation
  const currentActiveIndex = userQuestions.findIndex((q) => q.id === activeMessageId);
  const effectiveActiveIndex = currentActiveIndex >= 0 ? currentActiveIndex : userQuestions.length - 1;
  const activeQuestion = userQuestions[effectiveActiveIndex] || userQuestions[0];

  // Windowing for rail markers: show up to 15 markers max
  const visibleMarkers = React.useMemo(() => {
    if (userQuestions.length <= MAX_VISIBLE_MARKERS) {
      return userQuestions;
    }

    // Sliding window around active question to keep it in view
    let start = Math.max(0, effectiveActiveIndex - Math.floor(MAX_VISIBLE_MARKERS / 2));
    let end = start + MAX_VISIBLE_MARKERS;

    if (end > userQuestions.length) {
      end = userQuestions.length;
      start = Math.max(0, end - MAX_VISIBLE_MARKERS);
    }

    return userQuestions.slice(start, end);
  }, [userQuestions, effectiveActiveIndex]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setHoveredMarkerId(null);
    }, 200);
  };

  // Scroll active item into view inside preview list when opened
  useEffect(() => {
    if (isHovered && previewScrollRef.current && activeQuestion) {
      const activeEl = previewScrollRef.current.querySelector(
        `[data-question-id="${activeQuestion.id}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [isHovered, activeQuestion?.id]);

  const isRtl = language === "fa";

  return (
    <div
      className={`fixed ${
        isRtl ? "left-2 sm:left-3" : "right-2 sm:right-3"
      } top-1/2 -translate-y-1/2 z-30 select-none hidden sm:flex items-center`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Question Navigator"
    >
      {/* Pure Minimalist Question Markers (No bounding box, no container border/bg) */}
      <div
        className="flex flex-col items-center gap-1.5 py-1 px-1 cursor-pointer transition-opacity duration-200"
        title={isRtl ? `ناوبری پرسش‌ها (${userQuestions.length} پرسش)` : `Question Navigator (${userQuestions.length} questions)`}
      >
        {visibleMarkers.map((q) => {
          const isActive = q.id === activeQuestion?.id;
          const isMarkerHovered = q.id === hoveredMarkerId;

          return (
            <button
              key={q.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectQuestion(q.id);
              }}
              onMouseEnter={() => setHoveredMarkerId(q.id)}
              className="p-1 flex items-center justify-center cursor-pointer group focus:outline-none"
              aria-label={`Jump to question ${q.index}`}
            >
              {/* Minimal Dot Indicator */}
              <span
                className={`transition-all duration-150 rounded-full ${
                  isActive
                    ? "w-2 h-2 bg-[var(--accent-color,#818cf8)] scale-110 shadow-xs ring-2 ring-[var(--accent-color,#818cf8)]/30"
                    : isMarkerHovered
                    ? "w-1.5 h-1.5 bg-[var(--accent-color,#818cf8)] scale-125"
                    : "w-1 h-1 bg-[var(--text-muted,#6b7280)]/40 group-hover:bg-[var(--accent-color,#818cf8)]/80 group-hover:scale-125"
                }`}
              />

              {/* Single Marker Tooltip on direct marker hover when full panel is not open */}
              {!isHovered && isMarkerHovered && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    isRtl ? "left-6" : "right-6"
                  } w-60 max-w-xs px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary,#191a21)]/95 backdrop-blur-md border border-[var(--border-color,#282a36)] text-xs text-[var(--text-primary,#e6e9f0)] shadow-xl pointer-events-none animate-fadeIn z-40`}
                >
                  <div className="flex items-center gap-1 text-[10px] text-[var(--accent-color,#818cf8)] font-semibold mb-0.5">
                    <span>{isRtl ? `پرسش #${q.index}` : `Question #${q.index}`}</span>
                  </div>
                  <p
                    className={`truncate text-xs font-medium text-[var(--text-primary,#e6e9f0)] ${
                      isRtlText(q.firstLine) ? "text-right font-vazir" : "text-left font-latin"
                    }`}
                  >
                    {q.firstLine}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded Hover Preview Panel (List of all questions with smooth vertical scroll) */}
      {isHovered && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${
            isRtl ? "left-7" : "right-7"
          } w-76 sm:w-80 rounded-2xl bg-[var(--bg-secondary,#191a21)]/95 backdrop-blur-xl border border-[var(--border-color,#282a36)] shadow-2xl p-2 transition-all duration-200 animate-fadeIn z-40 flex flex-col`}
          style={{ maxHeight: `${VISIBLE_PREVIEW_ITEMS_HEIGHT + 70}px` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-[var(--border-subtle,#1e2029)] text-xs">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary,#9ba3b2)] font-semibold">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)]" />
              <span>{isRtl ? "فهرست پرسش‌ها" : "Questions"}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface,#1f212a)] text-[var(--accent-color,#818cf8)] border border-[var(--border-color,#282a36)]">
              {userQuestions.length}
            </span>
          </div>

          {/* Scrollable Questions List */}
          <div
            ref={previewScrollRef}
            className="overflow-y-auto custom-scrollbar space-y-0.5 pr-1 rtl:pr-0 rtl:pl-1 flex-1"
            style={{ maxHeight: `${VISIBLE_PREVIEW_ITEMS_HEIGHT}px` }}
          >
            {userQuestions.map((q) => {
              const isActive = q.id === activeQuestion?.id;
              const isQuestionRtl = isRtlText(q.firstLine) || (isRtl && !q.firstLine.startsWith("http"));

              return (
                <button
                  key={q.id}
                  data-question-id={q.id}
                  onClick={() => {
                    onSelectQuestion(q.id);
                    setIsHovered(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all text-left rtl:text-right cursor-pointer group/item ${
                    isActive
                      ? "bg-[var(--bg-surface,#1f212a)] text-[var(--text-primary,#e6e9f0)] border border-[var(--border-color,#282a36)] shadow-xs ring-1 ring-[var(--accent-color,#818cf8)]/30"
                      : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)] border border-transparent"
                  }`}
                >
                  {/* Number Badge */}
                  <span
                    className={`w-4.5 h-4.5 rounded flex items-center justify-center shrink-0 text-[10px] font-mono font-bold ${
                      isActive
                        ? "bg-[var(--accent-color,#818cf8)] text-white"
                        : "bg-[var(--btn-bg,#1c1e27)] text-[var(--text-muted,#6b7280)] group-hover/item:text-[var(--accent-color,#818cf8)]"
                    }`}
                  >
                    {q.index}
                  </span>

                  {/* Question First Line Preview */}
                  <div className="flex-1 overflow-hidden">
                    <p
                      className={`truncate text-[11.5px] leading-snug ${
                        isActive
                          ? "text-[var(--text-primary,#e6e9f0)] font-medium"
                          : "text-[var(--text-secondary,#9ba3b2)] group-hover/item:text-[var(--text-primary,#e6e9f0)]"
                      } ${isQuestionRtl ? "text-right font-vazir" : "text-left font-latin"}`}
                    >
                      {q.firstLine}
                    </p>
                  </div>

                  {/* Jump Icon */}
                  <ArrowUpRight className="w-3 h-3 text-[var(--text-muted,#6b7280)] opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 rtl:-rotate-90" />
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          {userQuestions.length > 13 && (
            <div className="pt-1 mt-1 border-t border-[var(--border-subtle,#1e2029)] text-center text-[9.5px] text-[var(--text-muted,#6b7280)]">
              {isRtl ? "برای مشاهده همه پرسش‌ها اسکرول کنید" : "Scroll to view all"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
