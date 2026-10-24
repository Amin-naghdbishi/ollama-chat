import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, RotateCcw, AlertTriangle, Sparkles } from "lucide-react";
import { normalizeToHex, parseColorToRgb, rgbToHex, ContrastResult, adjustBrightness } from "../../lib/colorUtils";
import { CustomColorPicker } from "./CustomColorPicker";

interface ColorTokenFieldProps {
  label: string;
  description?: string;
  tokenKey: string;
  value: string;
  baseValue?: string;
  onChange: (newValue: string) => void;
  onResetToBase?: () => void;
  contrastInfo?: ContrastResult;
  contrastContextLabel?: string;
  isImportant?: boolean;
  activePickerTokenKey?: string | null;
  onOpenPicker?: (tokenKey: string, anchorEl: HTMLElement) => void;
  onClosePicker?: () => void;
  onSelect?: (tokenKey: string) => void;
}

export const ColorTokenField: React.FC<ColorTokenFieldProps> = ({
  label,
  description,
  tokenKey,
  value,
  baseValue,
  onChange,
  onResetToBase,
  contrastInfo,
  contrastContextLabel,
  isImportant = false,
  activePickerTokenKey,
  onOpenPicker,
  onClosePicker,
  onSelect,
}) => {
  const [copied, setCopied] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [showPresets, setShowPresets] = useState(false);
  const [internalPickerOpen, setInternalPickerOpen] = useState(false);

  const swatchBtnRef = useRef<HTMLButtonElement>(null);
  const presetsBtnRef = useRef<HTMLDivElement>(null);

  // Sync text input whenever value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const hexVal = normalizeToHex(value, "#1f212a");
  const isChangedFromBase = baseValue !== undefined && baseValue.toLowerCase() !== value.toLowerCase();

  // Determine if picker for this field is currently open
  const isPickerOpen =
    activePickerTokenKey !== undefined
      ? activePickerTokenKey === tokenKey
      : internalPickerOpen;

  const handleOpenPicker = () => {
    if (swatchBtnRef.current) {
      if (onOpenPicker) {
        onOpenPicker(tokenKey, swatchBtnRef.current);
      } else {
        setInternalPickerOpen(true);
      }
    }
  };

  const handleClosePicker = () => {
    if (onClosePicker) {
      onClosePicker();
    } else {
      setInternalPickerOpen(false);
    }
  };

  const handleTextBlur = () => {
    const parsed = parseColorToRgb(inputValue);
    if (parsed) {
      const standardHex = rgbToHex(parsed);
      onChange(standardHex);
      setInputValue(standardHex);
    } else {
      // Revert if invalid
      setInputValue(value);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Close preset dropdown on outside click
  useEffect(() => {
    if (!showPresets) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (presetsBtnRef.current && !presetsBtnRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPresets]);

  // Quick shade variations (-30%, -15%, +15%, +30%)
  const shadeVariations = [
    { label: "-30%", color: adjustBrightness(hexVal, -30) },
    { label: "-15%", color: adjustBrightness(hexVal, -15) },
    { label: "Original", color: hexVal },
    { label: "+15%", color: adjustBrightness(hexVal, 15) },
    { label: "+30%", color: adjustBrightness(hexVal, 30) },
  ];

  return (
    <div
      onClick={() => onSelect?.(tokenKey)}
      className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer ${
        isChangedFromBase
          ? "bg-[var(--bg-surface,#1f212a)] border-[var(--accent-color,#818cf8)]/50 shadow-xs"
          : "bg-[var(--bg-secondary,#191a21)]/50 border-[var(--border-subtle,#1e2029)] hover:border-[var(--border-color,#282a36)]"
      }`}
    >
      {/* Label and token */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-xs text-[var(--text-primary,#e6e9f0)] tracking-tight truncate">
            {label}
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted,#6b7280)] bg-[var(--bg-primary,#131418)]/70 px-1.5 py-0.2 rounded-md border border-[var(--border-subtle,#1e2029)]">
            {tokenKey}
          </span>
          {isImportant && (
            <span className="px-1.5 py-0.2 rounded bg-[var(--accent-color,#818cf8)]/15 text-[var(--accent-color,#818cf8)] text-[9px] font-mono font-bold">
              CORE
            </span>
          )}
          {isChangedFromBase && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color,#818cf8)] shrink-0"
              title="Modified from base theme"
            />
          )}
        </div>
        {description && (
          <p className="text-[10px] text-[var(--text-muted,#6b7280)] truncate mt-0.5" title={description}>
            {description}
          </p>
        )}

        {/* Accessibility Contrast Warning Badge */}
        {contrastInfo && contrastInfo.status !== "pass" && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.2 rounded w-fit border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">
              Low contrast ({contrastInfo.formattedRatio})
            </span>
          </div>
        )}
      </div>

      {/* Controls: Color Swatch + Hex Input + Actions */}
      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
        {/* Custom Color Swatch & Popover Trigger */}
        <div className="relative">
          <button
            ref={swatchBtnRef}
            type="button"
            onClick={() => {
              onSelect?.(tokenKey);
              if (isPickerOpen) handleClosePicker();
              else handleOpenPicker();
            }}
            className={`w-7 h-7 rounded-lg border shadow-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden ${
              isPickerOpen
                ? "ring-2 ring-[var(--accent-color,#818cf8)] border-white/40 scale-105"
                : "border-black/30 hover:border-white/30"
            }`}
            style={{ backgroundColor: value }}
            title={`Click to open color picker for ${label}`}
            aria-haspopup="dialog"
            aria-expanded={isPickerOpen}
          >
            <span className="sr-only">Choose color for {label}</span>
          </button>

          {/* Contextual Custom Color Picker Popover */}
          <CustomColorPicker
            isOpen={isPickerOpen}
            color={value}
            initialColor={baseValue || value}
            title={label}
            tokenKey={tokenKey}
            anchorEl={swatchBtnRef.current}
            onClose={handleClosePicker}
            onChange={(newColor) => {
              onChange(newColor);
              setInputValue(newColor);
            }}
          />
        </div>

        {/* Text Input for Hex / CSS code */}
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onFocus={() => onSelect?.(tokenKey)}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleTextBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextBlur();
            }}
            placeholder="#000000"
            className="w-20 sm:w-22 px-2 py-1 rounded-lg bg-[var(--input-bg,#16171e)] border border-[var(--input-border,#2a2d3c)] focus:border-[var(--input-focus,#818cf8)] text-[var(--text-primary,#e6e9f0)] text-xs font-mono tracking-tight focus:outline-hidden"
            spellCheck={false}
          />
        </div>

        {/* Quick Shades Toggle */}
        <div ref={presetsBtnRef} className="relative">
          <button
            type="button"
            onClick={() => {
              onSelect?.(tokenKey);
              setShowPresets(!showPresets);
            }}
            className={`p-1 rounded-lg border text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer ${
              showPresets
                ? "bg-[var(--btn-hover,#262834)] border-[var(--accent-color,#818cf8)] text-white"
                : "bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border-[var(--border-color,#282a36)]"
            }`}
            title="Adjust shade variations (-30% to +30%)"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {showPresets && (
            <div className="absolute right-0 top-full mt-1.5 z-40 p-2 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-xl flex items-center gap-1.5 animate-scaleIn">
              {shadeVariations.map((sh, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange(sh.color);
                    setInputValue(sh.color);
                    setShowPresets(false);
                  }}
                  className="w-6 h-6 rounded-md border border-black/30 hover:scale-115 transition-transform shadow-xs flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: sh.color }}
                  title={`${sh.label}: ${sh.color}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Copy Color */}
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer"
          title="Copy HEX to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Reset to Base Value */}
        {onResetToBase && isChangedFromBase && (
          <button
            type="button"
            onClick={onResetToBase}
            className="p-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-muted,#6b7280)] hover:text-amber-400 transition-colors cursor-pointer"
            title={`Reset to base value (${baseValue})`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
