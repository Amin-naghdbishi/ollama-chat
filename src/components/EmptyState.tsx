import React, { useMemo } from "react";
import { Language, isRtlText } from "../lib/i18n";

interface EmptyStateProps {
  language?: Language;
}

const WELCOME_SENTENCES_EN = [
  "How can I help you today?",
  "What’s on your mind?",
  "What would you like to explore?",
  "What can we work on together?",
  "What would you like to know?",
  "What shall we create today?",
];

const WELCOME_SENTENCES_FA = [
  "امروز چطور می‌توانم کمکتان کنم؟",
  "به چه موضوعی فکر می‌کنید؟",
  "دوست دارید چه چیزی را بررسی کنیم؟",
  "روی چه کاری می‌توانیم با هم کار کنیم؟",
  "دوست دارید چه چیزی بدانید؟",
  "امروز چه چیزی خلق کنیم؟",
];

export const EmptyState: React.FC<EmptyStateProps> = ({
  language = "en",
}) => {
  // Randomly pick one welcoming sentence on mount/language change
  const greeting = useMemo(() => {
    const list = language === "fa" ? WELCOME_SENTENCES_FA : WELCOME_SENTENCES_EN;
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  }, [language]);

  const isRtl = language === "fa" || isRtlText(greeting);

  return (
    <div className="w-full flex flex-col items-center justify-center select-none text-center animate-fadeIn">
      <h2
        dir={isRtl ? "rtl" : "ltr"}
        className={`text-[21px] sm:text-[23px] font-normal text-[var(--text-primary,#e6e9f0)] text-center max-w-xl leading-relaxed tracking-normal select-none ${
          isRtl ? "font-vazir" : "font-latin"
        }`}
      >
        {greeting}
      </h2>
    </div>
  );
};
