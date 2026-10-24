import React, { useState, useMemo } from "react";
import hljs from "highlight.js";
import { Copy, Check, Code, Hash, WrapText } from "lucide-react";

interface CodeBlockProps {
  language: string;
  value: string;
}

// Map common language aliases to proper display names & hljs names
const LANGUAGE_CONFIG: Record<string, { hljsName: string; displayName: string }> = {
  py: { hljsName: "python", displayName: "Python" },
  python: { hljsName: "python", displayName: "Python" },
  js: { hljsName: "javascript", displayName: "JavaScript" },
  javascript: { hljsName: "javascript", displayName: "JavaScript" },
  mjs: { hljsName: "javascript", displayName: "JavaScript (ESM)" },
  cjs: { hljsName: "javascript", displayName: "JavaScript (CJS)" },
  ts: { hljsName: "typescript", displayName: "TypeScript" },
  typescript: { hljsName: "typescript", displayName: "TypeScript" },
  mts: { hljsName: "typescript", displayName: "TypeScript" },
  cts: { hljsName: "typescript", displayName: "TypeScript" },
  jsx: { hljsName: "javascript", displayName: "React JSX" },
  tsx: { hljsName: "typescript", displayName: "React TSX" },
  html: { hljsName: "xml", displayName: "HTML" },
  htm: { hljsName: "xml", displayName: "HTML" },
  xml: { hljsName: "xml", displayName: "XML" },
  svg: { hljsName: "xml", displayName: "SVG" },
  css: { hljsName: "css", displayName: "CSS" },
  scss: { hljsName: "scss", displayName: "SCSS" },
  sass: { hljsName: "scss", displayName: "Sass" },
  less: { hljsName: "less", displayName: "Less" },
  json: { hljsName: "json", displayName: "JSON" },
  json5: { hljsName: "json", displayName: "JSON5" },
  jsonc: { hljsName: "json", displayName: "JSON with Comments" },
  bash: { hljsName: "bash", displayName: "Bash" },
  sh: { hljsName: "bash", displayName: "Shell" },
  shell: { hljsName: "bash", displayName: "Shell" },
  zsh: { hljsName: "bash", displayName: "Zsh" },
  fish: { hljsName: "bash", displayName: "Fish" },
  c: { hljsName: "c", displayName: "C" },
  h: { hljsName: "c", displayName: "C Header" },
  cpp: { hljsName: "cpp", displayName: "C++" },
  "c++": { hljsName: "cpp", displayName: "C++" },
  cc: { hljsName: "cpp", displayName: "C++" },
  cxx: { hljsName: "cpp", displayName: "C++" },
  hpp: { hljsName: "cpp", displayName: "C++ Header" },
  cs: { hljsName: "csharp", displayName: "C#" },
  csharp: { hljsName: "csharp", displayName: "C#" },
  "c#": { hljsName: "csharp", displayName: "C#" },
  java: { hljsName: "java", displayName: "Java" },
  kt: { hljsName: "kotlin", displayName: "Kotlin" },
  kotlin: { hljsName: "kotlin", displayName: "Kotlin" },
  rust: { hljsName: "rust", displayName: "Rust" },
  rs: { hljsName: "rust", displayName: "Rust" },
  go: { hljsName: "go", displayName: "Go" },
  golang: { hljsName: "go", displayName: "Go" },
  sql: { hljsName: "sql", displayName: "SQL" },
  mysql: { hljsName: "sql", displayName: "MySQL" },
  pgsql: { hljsName: "sql", displayName: "PostgreSQL" },
  postgres: { hljsName: "sql", displayName: "PostgreSQL" },
  markdown: { hljsName: "markdown", displayName: "Markdown" },
  md: { hljsName: "markdown", displayName: "Markdown" },
  mdx: { hljsName: "markdown", displayName: "MDX" },
  yaml: { hljsName: "yaml", displayName: "YAML" },
  yml: { hljsName: "yaml", displayName: "YAML" },
  toml: { hljsName: "ini", displayName: "TOML" },
  ini: { hljsName: "ini", displayName: "INI" },
  env: { hljsName: "bash", displayName: ".ENV" },
  docker: { hljsName: "dockerfile", displayName: "Dockerfile" },
  dockerfile: { hljsName: "dockerfile", displayName: "Dockerfile" },
  makefile: { hljsName: "makefile", displayName: "Makefile" },
  make: { hljsName: "makefile", displayName: "Makefile" },
  graphql: { hljsName: "graphql", displayName: "GraphQL" },
  gql: { hljsName: "graphql", displayName: "GraphQL" },
  swift: { hljsName: "swift", displayName: "Swift" },
  php: { hljsName: "php", displayName: "PHP" },
  ruby: { hljsName: "ruby", displayName: "Ruby" },
  rb: { hljsName: "ruby", displayName: "Ruby" },
  lua: { hljsName: "lua", displayName: "Lua" },
  r: { hljsName: "r", displayName: "R" },
  perl: { hljsName: "perl", displayName: "Perl" },
  dart: { hljsName: "dart", displayName: "Dart" },
  diff: { hljsName: "diff", displayName: "Diff" },
  plaintext: { hljsName: "plaintext", displayName: "Plain Text" },
  text: { hljsName: "plaintext", displayName: "Text" },
  txt: { hljsName: "plaintext", displayName: "Text" },
};

export const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ language, value }) => {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);

  // Clean trailing empty lines & carriage returns
  const cleanValue = useMemo(() => {
    if (!value) return "";
    return value.replace(/[\r\n]+$/, "");
  }, [value]);

  // Normalize language name
  const cleanLang = (language || "").trim().toLowerCase();
  const config = LANGUAGE_CONFIG[cleanLang] || {
    hljsName: cleanLang || "plaintext",
    displayName: cleanLang ? cleanLang.toUpperCase() : "CODE",
  };

  // Perform syntax highlighting via highlight.js
  const highlightedHtml = useMemo(() => {
    if (!cleanValue) return "";
    try {
      if (config.hljsName && hljs.getLanguage(config.hljsName)) {
        return hljs.highlight(cleanValue, {
          language: config.hljsName,
          ignoreIllegals: true,
        }).value;
      }
      // Auto-detect fallback if language is missing/unsupported
      const autoRes = hljs.highlightAuto(cleanValue);
      return autoRes.value;
    } catch {
      // Escape HTML on fallback
      return cleanValue
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
  }, [cleanValue, config.hljsName]);

  const lines = useMemo(() => cleanValue.split("\n"), [cleanValue]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      dir="ltr"
      className="bg-[var(--code-bg)] border border-[var(--code-border)] rounded-xl overflow-hidden my-3.5 shadow-sm font-mono text-[12.5px] group/code text-left transition-colors duration-200"
    >
      {/* Code Block Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[var(--code-header-bg)] border-b border-[var(--code-border)] text-[var(--text-secondary)] select-none">
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-[var(--accent-color)] shrink-0" />
          <span className="text-[11.5px] font-semibold font-mono tracking-wide text-[var(--code-text)]">
            {config.displayName}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            {lines.length} {lines.length === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Toggle Line Numbers */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              showLineNumbers
                ? "text-[var(--accent-color)] bg-[var(--bg-surface)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--btn-hover)]"
            }`}
            title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
            aria-label="Toggle line numbers"
          >
            <Hash className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Word Wrap */}
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              wordWrap
                ? "text-[var(--accent-color)] bg-[var(--bg-surface)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--btn-hover)]"
            }`}
            title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
            aria-label="Toggle word wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[var(--code-border)] mx-0.5" />

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--btn-bg)] hover:bg-[var(--btn-hover)] text-[var(--text-primary)] hover:text-[var(--accent-color)] border border-[var(--code-border)] transition-all text-[11px] font-medium cursor-pointer shadow-xs"
            title="Copy code to clipboard"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Container with Optional Line Numbers */}
      <div className="relative flex overflow-x-auto p-3.5 bg-[var(--code-bg)] custom-scrollbar">
        {showLineNumbers && (
          <div
            className="select-none text-[var(--text-muted)] opacity-60 text-right pr-3 mr-3 border-r border-[var(--code-border)] font-mono text-[12.5px] leading-[1.65rem] shrink-0 pointer-events-none"
            aria-hidden="true"
          >
            {lines.map((_, i) => (
              <div key={i} className="h-[1.65rem] leading-[1.65rem]">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        <div
          className={`flex-1 text-[var(--code-text)] font-mono text-[12.5px] leading-[1.65rem] ${
            wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
          }`}
        >
          <pre className="font-mono m-0 p-0 bg-transparent text-[12.5px] leading-[1.65rem]">
            <code
              className={`hljs language-${config.hljsName} block p-0 bg-transparent text-[12.5px] leading-[1.65rem] tracking-[0.015em]`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";
