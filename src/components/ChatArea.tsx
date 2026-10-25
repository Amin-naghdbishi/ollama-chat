import React, { useRef, useEffect, useState, useCallback } from "react";
import { ArrowDown, AlertCircle } from "lucide-react";
import { ChatMessage, OllamaModel, AIActivityState, FileAttachment } from "../types";
import { MessageBubble } from "./MessageBubble";
import { EmptyState } from "./EmptyState";
import { QuestionNavigator } from "./QuestionNavigator";
import { Language, getTranslation } from "../lib/i18n";

interface ChatAreaProps {
  messages: ChatMessage[];
  selectedModel: string | null;
  models: OllamaModel[];
  onSelectPrompt: (prompt: string) => void;
  onOpenModelPicker: () => void;
  onRetryMessage: (messageId: string) => void;
  onContinueMessage?: (messageId: string) => void;
  onFinishMessage?: (messageId: string) => void;
  onRetryImage?: (messageId: string) => void;
  onStopImage?: (messageId: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  isGenerating: boolean;
  activeActivityState?: AIActivityState;
  error?: string | null;
  onDismissError?: () => void;
  language?: Language;
  onApplyImageEdit?: (params: {
    sourceMessageId?: string;
    sourceImageUrl: string;
    sourceVersionId?: string;
    sourceTitle?: string;
    editInstruction: string;
    referenceImages?: FileAttachment[];
  }) => Promise<string | null>;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  selectedModel,
  models,
  onSelectPrompt,
  onOpenModelPicker,
  onRetryMessage,
  onContinueMessage,
  onFinishMessage,
  onRetryImage,
  onStopImage,
  onEditMessage,
  onDeleteMessage,
  isGenerating,
  activeActivityState,
  error,
  onDismissError,
  language = "en",
  onApplyImageEdit,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const isAutoScrollAllowed = useRef(true);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  // Update active question based on viewport position
  const updateActiveQuestion = useCallback(() => {
    if (!scrollRef.current) return;
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return;

    const containerRect = scrollRef.current.getBoundingClientRect();
    let closestId = userMessages[userMessages.length - 1].id;
    let minDistance = Infinity;

    for (const uMsg of userMessages) {
      const el = document.getElementById(`message-${uMsg.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Measure offset from container top with a slight offset threshold
        const distance = Math.abs(rect.top - containerRect.top - 60);
        if (distance < minDistance) {
          minDistance = distance;
          closestId = uMsg.id;
        }
      }
    }
    setActiveQuestionId(closestId);
  }, [messages]);

  // Handle scroll events to detect manual scroll & track active question
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 80) {
      isAutoScrollAllowed.current = false;
      setShowScrollBottom(true);
    } else {
      isAutoScrollAllowed.current = true;
      setShowScrollBottom(false);
    }

    updateActiveQuestion();
  };

  const scrollToBottom = (smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  const handleSelectQuestion = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveQuestionId(messageId);
      isAutoScrollAllowed.current = false;
      setShowScrollBottom(true);
    }
  };

  // Auto-scroll when messages update if near bottom
  useEffect(() => {
    if (isAutoScrollAllowed.current) {
      scrollToBottom(false);
    }
    updateActiveQuestion();
  }, [messages, isGenerating, updateActiveQuestion]);

  // Adjust scroll when virtual keyboard opens or viewport resizes on mobile
  useEffect(() => {
    const handleViewportResize = () => {
      if (isAutoScrollAllowed.current) {
        scrollToBottom(false);
      }
    };

    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
      return () => {
        window.visualViewport?.removeEventListener("resize", handleViewportResize);
      };
    }
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar min-h-0">
        <EmptyState language={language} />
      </div>
    );
  }

  // Find last assistant message ID
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col min-h-0">
      {/* Question Navigator on the side */}
      <QuestionNavigator
        messages={messages}
        activeMessageId={activeQuestionId}
        onSelectQuestion={handleSelectQuestion}
        language={language}
      />

      {/* Scrollable Message List with Enhanced Usable Width */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-6 custom-scrollbar space-y-4"
      >
        <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto space-y-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRetry={onRetryMessage}
              onContinue={onContinueMessage}
              onFinish={onFinishMessage}
              onRetryImage={onRetryImage}
              onStopImage={onStopImage}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              isLastAssistantMessage={lastAssistantMsg?.id === msg.id}
              isStreaming={msg.isStreaming}
              activeActivityState={lastAssistantMsg?.id === msg.id ? activeActivityState : undefined}
              language={language}
              selectedModel={selectedModel}
              onApplyImageEdit={onApplyImageEdit}
            />
          ))}

          {/* Global Error Banner */}
          {error && (
            <div className="my-4 p-4 rounded-2xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-start justify-between gap-3 shadow-lg animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block text-red-300 text-sm">
                    {t("communicationError")}
                  </span>
                  <span className="leading-relaxed text-xs">{error}</span>
                </div>
              </div>
              {onDismissError && (
                <button
                  onClick={onDismissError}
                  className="px-3 py-1.5 bg-red-900/70 hover:bg-red-800 rounded-xl text-red-100 font-medium transition-colors shrink-0 cursor-pointer"
                >
                  {t("dismiss")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => {
            isAutoScrollAllowed.current = true;
            scrollToBottom(true);
            setShowScrollBottom(false);
          }}
          className="absolute bottom-6 right-6 rtl:right-auto rtl:left-6 p-3 rounded-full bg-[var(--bg-surface,#1f212a)]/95 hover:bg-[var(--btn-hover,#262834)] active:scale-95 border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] shadow-2xl backdrop-blur-md transition-all duration-200 z-20 cursor-pointer flex items-center justify-center"
          title="Scroll to bottom"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4 text-current" />
        </button>
      )}
    </div>
  );
};
