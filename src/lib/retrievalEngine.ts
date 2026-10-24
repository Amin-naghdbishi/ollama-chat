import {
  ChatMessage,
  ContextMemoryItem,
  Conversation,
  RecallIntentInfo,
  RetrievedMemoryCitation,
  FileAttachment,
} from "../types";
import { estimateTextTokens, estimateTotalPromptTokens } from "./contextUtils";

// Extended stop words for English and Persian
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
  "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
  "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
  "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
  "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
  "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
  "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
  "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
  "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
  "they're", "they've", "this", "those", "through", "to", "too", "under", "until",
  "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
  "yourself", "yourselves", "please", "thanks", "thank", "hello", "hi", "hey",
  // Persian common stop words
  "از", "به", "با", "در", "بر", "برای", "که", "تا", "این", "آن", "یک", "را",
  "است", "بود", "شد", "شدن", "دارد", "داشت", "کرد", "کردن", "می", "هم", "نیز",
  "چون", "اگر", "ولی", "اما", "یا", "چه", "چرا", "چگونه", "کجا", "کی", "من",
  "تو", "او", "ما", "شما", "آنها", "لطفا", "سلام", "درود", "مرسی", "متشکرم",
  "بوده", "هست", "نیست", "باشه", "خیلی", "همه", "روی", "زیر", "بین",
]);

/**
 * Tokenize and extract keywords from text with Unicode support.
 */
export function extractKeywords(text: string, maxKeywords = 16): string[] {
  if (!text) return [];

  const cleaned = text.toLowerCase().replace(/[`*_#[\]()",:;?!]/g, " ");
  const rawTokens = cleaned.match(/[\p{L}\p{N}_\-\.]{2,40}/gu) || [];

  const freq: Record<string, number> = {};
  for (const token of rawTokens) {
    if (!STOP_WORDS.has(token) && !/^\d+$/.test(token)) {
      freq[token] = (freq[token] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Computes character trigrams for robust fuzzy / lexical matching.
 */
function getTrigrams(text: string): Set<string> {
  const set = new Set<string>();
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length < 3) {
    if (normalized.length > 0) set.add(normalized);
    return set;
  }
  for (let i = 0; i <= normalized.length - 3; i++) {
    set.add(normalized.substring(i, i + 3));
  }
  return set;
}

/**
 * Computes Trigram similarity score between two strings (0.0 to 1.0).
 */
export function trigramSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const t1 = getTrigrams(str1);
  const t2 = getTrigrams(str2);
  if (t1.size === 0 || t2.size === 0) return 0;

  let intersection = 0;
  t1.forEach((tri) => {
    if (t2.has(tri)) intersection++;
  });

  return (2.0 * intersection) / (t1.size + t2.size);
}

/**
 * High-Precision Intent Detector for recall queries (English & Persian).
 */
export function detectRecallIntent(query: string): RecallIntentInfo {
  if (!query || !query.trim()) {
    return {
      isRecallIntent: false,
      isExplicitRecall: false,
      intentType: "general",
      detectedKeywords: [],
      targetEntities: [],
      cleanQuery: query,
    };
  }

  const normalized = query.toLowerCase().trim();

  // 1. Explicit Recall Triggers (English & Persian)
  const explicitPatterns = [
    /\b(remember|recall|do you remember|did we decide|what did we (say|decide|choose|discuss|implement|agree|name)|what was (the|my|our) (project|name|codename|architecture|decision|choice|database|port|config|theme|button|task|password|key)|what was the name of (my|the) project|as (we|i) (discussed|said|mentioned) (earlier|before|previously|yesterday|near the beginning)|find what we (discussed|decided|agreed))\b/i,
    /(یادت\s*هست|یادت\s*میاد|یادته|به\s*خاطر\s*بیار|به\s*یاد\s*بیار|به\s*خاطر\s*بسپار|قبلاً\s*درباره|قبلا\s*درباره|قبلاً\s*گفتیم|قبلا\s*گفتم|تصمیم\s*گرفتیم|پروژه\s*قبلی|اسم\s*پروژه|چی\s*تصمیم\s*گرفتیم|چی\s*گفتیم|چی\s*بود|چطور\s*طراحی\s*کردیم|چیکار\s*کردیم|گفتم\s*که|قرار\s*شد|کد\s*پروژه|نام\s*پروژه)/i,
  ];

  // 2. Implicit Historical Context Triggers
  const implicitPatterns = [
    /\b(last time|previous (session|chat|conversation|project|discussion)|our earlier|based on what we decided|earlier project|my project|initial decision|unfinished task|future plans|earlier code)\b/i,
    /(جلسه\s*قبل|دفعه\s*قبل|گفتگوی\s*قبلی|پروژه‌\s*ای\s*که|پروژه\s*من|معماری\s*ای\s*که|طبق\s*تصمیم\s*قبلی|کارهای\s*باقی‌مانده|کد\s*قبلی)/i,
  ];

  // 3. User Correction Triggers
  const correctionPatterns = [
    /\b(actually we changed|no longer|instead of .* now|i am correcting|change the decision to|we switched to|threshold should be .* not)\b/i,
    /(قبلاً\s*گفتم.*ولی|دیگه.*نیست|تصمیم\s*عوض\s*شد|تغییر\s*کرد\s*به|اصلاح\s*می‌کنم|عوض\s*کردیم\s*به|باید.*باشه\s*نه)/i,
  ];

  const isExplicit = explicitPatterns.some((pattern) => pattern.test(normalized));
  const isCorrection = correctionPatterns.some((pattern) => pattern.test(normalized));
  const isImplicit = !isExplicit && !isCorrection && implicitPatterns.some((pattern) => pattern.test(normalized));

  const isRecallIntent = isExplicit || isCorrection || isImplicit;
  let intentType: RecallIntentInfo["intentType"] = "general";
  if (isCorrection) intentType = "correction";
  else if (isExplicit) intentType = "explicit_recall";
  else if (isImplicit) intentType = "implicit_history";

  const keywords = extractKeywords(normalized, 12);
  const targetEntities: string[] = [];

  const entityKeywords = [
    "orbit", "project", "codename", "provider", "dns", "ollama", "architecture", "model",
    "theme", "database", "api", "port", "config", "token", "context", "auth", "redis",
    "docker", "button", "constraint", "requirement", "postgresql", "openrouter", "sqlite",
    "پروژه", "اورورا", "پرووایدر", "معماری", "اولاما", "پایگاه داده", "دیتابیس", "تنظیمات", "دکمه",
  ];

  for (const ek of entityKeywords) {
    if (normalized.includes(ek)) {
      targetEntities.push(ek);
    }
  }

  return {
    isRecallIntent,
    isExplicitRecall: isExplicit,
    intentType,
    detectedKeywords: keywords,
    targetEntities,
    cleanQuery: normalized,
  };
}

/**
 * Unified Search Result Item across Memories, Conversations, Context, and Files.
 */
export interface UnifiedSearchResultItem {
  id: string;
  type: "memory" | "conversation" | "context" | "file";
  title: string;
  subtitle?: string;
  snippet: string;
  score: number;
  timestamp: number;
  provenance: {
    conversationId?: string;
    conversationTitle?: string;
    messageId?: string;
    messageIndex?: number;
    role?: "user" | "assistant" | "system";
    modelId?: string;
    fileName?: string;
    fileSize?: number;
  };
  metadata?: {
    importance?: string;
    isPinned?: boolean;
    isAuthoritative?: boolean;
    topics?: string[];
    tokenEstimate?: number;
    rawObject?: any;
  };
}

/**
 * Searches the Global Memory Store.
 */
export function searchGlobalMemories(
  query: string,
  memories: ContextMemoryItem[],
  options: {
    activeModel?: string;
    minScore?: number;
    maxResults?: number;
    folderId?: string;
    onlyPinned?: boolean;
  } = {}
): UnifiedSearchResultItem[] {
  const { minScore = 0.15, maxResults = 20, folderId, onlyPinned } = options;
  const qClean = query.trim().toLowerCase();
  const qKeywords = extractKeywords(qClean);

  const results: UnifiedSearchResultItem[] = [];

  for (const mem of memories) {
    if (folderId && mem.folderId !== folderId) continue;
    if (onlyPinned && !mem.isPinned) continue;

    let score = 0;

    if (!qClean) {
      // Return all ordered by pinned + importance + recency
      score = (mem.isPinned ? 0.5 : 0.1) + (mem.importanceScore || 0.5) * 0.3;
    } else {
      // 1. Exact Substring in Title
      if (mem.title.toLowerCase().includes(qClean)) {
        score += 0.45;
      }
      // 2. Exact Substring in Summary or Facts
      if (mem.summary.toLowerCase().includes(qClean)) {
        score += 0.35;
      }
      const factMatch = mem.keyFacts.some((f) => f.toLowerCase().includes(qClean));
      if (factMatch) score += 0.30;

      // 3. Keyword Overlap (BM25 heuristic)
      const memKeywords = [
        ...mem.topics,
        ...mem.tags,
        ...extractKeywords(mem.title),
        ...extractKeywords(mem.summary),
      ].map((k) => k.toLowerCase());

      let keywordHits = 0;
      for (const qk of qKeywords) {
        if (memKeywords.includes(qk)) keywordHits++;
      }
      if (qKeywords.length > 0) {
        score += (keywordHits / qKeywords.length) * 0.35;
      }

      // 4. Trigram Similarity
      const triScore = Math.max(
        trigramSimilarity(qClean, mem.title),
        trigramSimilarity(qClean, mem.summary)
      );
      score += triScore * 0.25;

      // 5. Importance & Pin Boost
      if (mem.isPinned) score += 0.15;
      if (mem.isAuthoritative !== false) score += 0.05;
      if (mem.importance === "critical") score += 0.15;
      else if (mem.importance === "high") score += 0.10;
    }

    if (score >= minScore) {
      results.push({
        id: mem.id,
        type: "memory",
        title: mem.title,
        subtitle: mem.conversationTitle ? `From: ${mem.conversationTitle}` : "Global Memory",
        snippet: mem.summary || mem.keyFacts.join(" • "),
        score: Math.min(1.0, score),
        timestamp: mem.updatedAt || mem.createdAt,
        provenance: {
          conversationId: mem.conversationId,
          conversationTitle: mem.conversationTitle,
        },
        metadata: {
          importance: mem.importance,
          isPinned: mem.isPinned,
          isAuthoritative: mem.isAuthoritative,
          topics: mem.topics,
          tokenEstimate: mem.compressedTokenEstimate,
          rawObject: mem,
        },
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/**
 * Searches across all Historical Conversations (Raw Conversation Ledger).
 */
export function searchAllConversations(
  query: string,
  conversations: Conversation[],
  options: {
    maxResults?: number;
    minScore?: number;
    excludeConversationId?: string;
  } = {}
): UnifiedSearchResultItem[] {
  const { maxResults = 30, minScore = 0.2, excludeConversationId } = options;
  const qClean = query.trim().toLowerCase();
  if (!qClean) return [];

  const qKeywords = extractKeywords(qClean);
  const results: UnifiedSearchResultItem[] = [];

  for (const conv of conversations) {
    if (excludeConversationId && conv.id === excludeConversationId) continue;

    // Check title match
    const titleMatch = conv.title.toLowerCase().includes(qClean);

    // Search messages
    conv.messages.forEach((msg, idx) => {
      const contentLower = msg.content.toLowerCase();
      let matchScore = 0;

      if (contentLower.includes(qClean)) {
        matchScore += 0.6;
      }

      let hitCount = 0;
      for (const qk of qKeywords) {
        if (contentLower.includes(qk)) hitCount++;
      }
      if (qKeywords.length > 0) {
        matchScore += (hitCount / qKeywords.length) * 0.4;
      }

      if (titleMatch) {
        matchScore += 0.2;
      }

      if (matchScore >= minScore) {
        // Extract surrounding snippet
        const matchIdx = contentLower.indexOf(qClean);
        const start = Math.max(0, matchIdx - 60);
        const end = Math.min(msg.content.length, matchIdx + qClean.length + 80);
        let snippet = msg.content.substring(start, end).trim();
        if (start > 0) snippet = "..." + snippet;
        if (end < msg.content.length) snippet = snippet + "...";

        results.push({
          id: `conv-msg-${conv.id}-${msg.id}`,
          type: "conversation",
          title: conv.title,
          subtitle: `Turn #${idx + 1} (${msg.role === "user" ? "User" : "Assistant"}) • ${new Date(msg.timestamp).toLocaleDateString()}`,
          snippet: snippet || msg.content.slice(0, 140),
          score: Math.min(1.0, matchScore),
          timestamp: msg.timestamp || conv.updatedAt,
          provenance: {
            conversationId: conv.id,
            conversationTitle: conv.title,
            messageId: msg.id,
            messageIndex: idx,
            role: msg.role,
            modelId: conv.modelId,
          },
          metadata: {
            tokenEstimate: estimateTextTokens(msg.content),
            rawObject: msg,
          },
        });
      }
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/**
 * Searches the Current Active Conversation Context (Messages, Attachments & Turns).
 */
export function searchActiveContext(
  query: string,
  activeConversation: Conversation | null,
  options: {
    maxResults?: number;
  } = {}
): UnifiedSearchResultItem[] {
  const { maxResults = 25 } = options;
  if (!activeConversation) return [];

  const qClean = query.trim().toLowerCase();
  const qKeywords = extractKeywords(qClean);
  const results: UnifiedSearchResultItem[] = [];

  // 1. Search System Prompt if present
  if (activeConversation.systemPrompt) {
    const spLower = activeConversation.systemPrompt.toLowerCase();
    if (!qClean || spLower.includes(qClean)) {
      results.push({
        id: `ctx-sp-${activeConversation.id}`,
        type: "context",
        title: "Active System Prompt",
        subtitle: "Base instruction for this chat",
        snippet: activeConversation.systemPrompt.slice(0, 160),
        score: 0.9,
        timestamp: activeConversation.createdAt,
        provenance: {
          conversationId: activeConversation.id,
          conversationTitle: activeConversation.title,
          role: "system",
        },
        metadata: {
          tokenEstimate: estimateTextTokens(activeConversation.systemPrompt),
        },
      });
    }
  }

  // 2. Search Messages
  activeConversation.messages.forEach((msg, idx) => {
    const contentLower = msg.content.toLowerCase();
    let score = 0;

    if (!qClean) {
      score = 0.5 + (idx / Math.max(1, activeConversation.messages.length)) * 0.4;
    } else {
      if (contentLower.includes(qClean)) score += 0.6;
      let kwHits = 0;
      for (const k of qKeywords) {
        if (contentLower.includes(k)) kwHits++;
      }
      if (qKeywords.length > 0) {
        score += (kwHits / qKeywords.length) * 0.4;
      }
    }

    if (score > 0.2 || !qClean) {
      results.push({
        id: `ctx-msg-${msg.id}`,
        type: "context",
        title: `Message #${idx + 1} (${msg.role === "user" ? "User" : "Assistant"})`,
        subtitle: new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        snippet: msg.content.slice(0, 160) || "*(Empty or attachment)*",
        score: Math.min(1.0, score),
        timestamp: msg.timestamp,
        provenance: {
          conversationId: activeConversation.id,
          conversationTitle: activeConversation.title,
          messageId: msg.id,
          messageIndex: idx,
          role: msg.role,
        },
        metadata: {
          tokenEstimate: estimateTextTokens(msg.content),
          rawObject: msg,
        },
      });
    }

    // 3. Search Attachments in message
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((att) => {
        const attText = (att.name + " " + (att.textContent || "")).toLowerCase();
        if (!qClean || attText.includes(qClean)) {
          results.push({
            id: `ctx-att-${att.id}`,
            type: "file",
            title: att.name,
            subtitle: `Attached in Turn #${idx + 1} • ${(att.size / 1024).toFixed(1)} KB`,
            snippet: att.textContent ? att.textContent.slice(0, 140) : "Image attachment",
            score: 0.8,
            timestamp: msg.timestamp,
            provenance: {
              conversationId: activeConversation.id,
              conversationTitle: activeConversation.title,
              messageId: msg.id,
              messageIndex: idx,
              fileName: att.name,
              fileSize: att.size,
            },
            metadata: {
              tokenEstimate: att.isImage ? 950 : estimateTextTokens(att.textContent || ""),
              rawObject: att,
            },
          });
        }
      });
    }
  });

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/**
 * Builds small-model-proof prompt injection using "Inverted Epistemic Knowledge" pattern.
 * This guarantees small models (Llama-3-8B, Qwen-2.5, Gemma-2, Mistral) won't refuse recall requests.
 */
export function generateInvertedEpistemicPrompt(
  retrievedMemories: ContextMemoryItem[],
  citations: RetrievedMemoryCitation[]
): string {
  if (!retrievedMemories || retrievedMemories.length === 0) {
    return "";
  }

  const sections: string[] = [];

  // Epistemic Anchor Frame
  sections.push(
    `[PERSISTENT APPLICATION KNOWLEDGE BASE - DIRECT WORKSPACE MEMORIES]
You possess direct, verified access to the following workspace memory records.
CRITICAL OPERATING DIRECTIVE:
1. Treat every record below as absolute, authoritative factual history established with the user.
2. NEVER state "I don't have memory", "I cannot remember previous chats", or "as an AI I have no persistent state".
3. When answering questions about past decisions, codenames, configurations, or architectures, answer directly and authoritatively using these verified records.
4. When relevant, reference the source decision smoothly.`
  );

  retrievedMemories.forEach((mem, idx) => {
    const lines: string[] = [];
    const sourceLabel = mem.conversationTitle ? `Source Chat: "${mem.conversationTitle}"` : "Global Workspace Memory";
    const cycleLabel = mem.compressionCycle ? `Cycle #${mem.compressionCycle}` : "Active";
    const statusLabel = mem.isAuthoritative === false ? "(Historical / Superseded)" : "(Authoritative Decision)";

    lines.push(`--- MEMORY RECORD #${idx + 1}: ${mem.title} [${sourceLabel} | ${cycleLabel} | ${statusLabel}] ---`);

    if (mem.summary) {
      lines.push(`Overview: ${mem.summary}`);
    }

    if (mem.keyFacts && mem.keyFacts.length > 0) {
      lines.push(`Key Facts & Decisions:`);
      mem.keyFacts.forEach((fact) => lines.push(`  • ${fact}`));
    }

    if (mem.requirements && mem.requirements.length > 0) {
      lines.push(`Active Constraints & Requirements:`);
      mem.requirements
        .filter((r) => r.isAuthoritative !== false)
        .forEach((req) => lines.push(`  • [${req.type.toUpperCase()}] ${req.content}`));
    }

    if (mem.sourceExcerpt) {
      lines.push(`Original Dialogue Excerpt: "${mem.sourceExcerpt}"`);
    }

    sections.push(lines.join("\n"));
  });

  sections.push(`[END OF VERIFIED WORKSPACE MEMORIES]\n`);

  return sections.join("\n\n");
}
