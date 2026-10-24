import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, RotateCcw, Check, Pipette, Hash, Sliders } from "lucide-react";
import {
  parseColorToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  rgbToCss,
  HsvColor,
  RgbColor,
} from "../../lib/colorUtils";

export interface CustomColorPickerProps {
  isOpen: boolean;
  color: string;
  initialColor?: string;
  title?: string;
  tokenKey?: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onChange: (colorCss: string) => void;
}

export const CustomColorPicker: React.FC<CustomColorPickerProps> = ({
  isOpen,
  color,
  initialColor,
  title,
  tokenKey,
  anchorEl,
  onClose,
  onChange,
}) => {
  // Parse incoming color to RGB and HSV
  const parseColorState = useCallback((cStr: string): { hsv: HsvColor; rgb: RgbColor; hex: string } => {
    const rgb = parseColorToRgb(cStr) || { r: 129, g: 140, b: 248, a: 1 };
    const hsv = rgbToHsv(rgb);
    const hex = rgbToHex(rgb);
    return { hsv, rgb, hex };
  }, []);

  const [hsv, setHsv] = useState<HsvColor>(() => parseColorState(color).hsv);
  const [rgb, setRgb] = useState<RgbColor>(() => parseColorState(color).rgb);
  const [hexInput, setHexInput] = useState<string>(() => parseColorState(color).hex);
  const [inputMode, setInputMode] = useState<"hex" | "rgb">("hex");
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const popoverRef = useRef<HTMLDivElement>(null);
  const satValBoxRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const alphaBarRef = useRef<HTMLDivElement>(null);

  // Synchronize internal state whenever the token or color prop changes externally
  useEffect(() => {
    if (isOpen) {
      const parsed = parseColorState(color);
      setHsv(parsed.hsv);
      setRgb(parsed.rgb);
      setHexInput(parsed.hex);
    }
  }, [isOpen, color, tokenKey, parseColorState]);

  // Calculate intelligent popover position relative to anchor element
  useEffect(() => {
    if (!isOpen || !anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const popoverWidth = 270;
      const popoverHeight = 360;
      const margin = 8;

      // Vertical positioning: default below, flip above if not enough space
      let top = rect.bottom + margin;
      if (top + popoverHeight > window.innerHeight - 16) {
        // Try placing above
        const aboveTop = rect.top - popoverHeight - margin;
        if (aboveTop >= 16) {
          top = aboveTop;
        } else {
          // If neither fits well, clamp to viewport bottom
          top = Math.max(16, window.innerHeight - popoverHeight - 16);
        }
      }

      // Horizontal positioning: align with anchor left, but keep inside viewport
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) {
        left = 16;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, anchorEl]);

  // Global click outside and Escape key listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, onClose, anchorEl]);

  // Emit color update to parent
  const emitColorChange = useCallback(
    (newHsv: HsvColor) => {
      const newRgb = hsvToRgb(newHsv);
      setHsv(newHsv);
      setRgb(newRgb);
      setHexInput(rgbToHex(newRgb));

      const css = rgbToCss(newRgb);
      onChange(css);
    },
    [onChange]
  );

  // Saturation & Value area drag handler
  const handleSatValMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!satValBoxRef.current) return;
      const rect = satValBoxRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const s = x / rect.width;
      const v = 1 - y / rect.height;

      emitColorChange({ ...hsv, s, v });
    },
    [hsv, emitColorChange]
  );

  const handleSatValPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleSatValMove(e.clientX, e.clientY);
  };

  const handleSatValPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0) {
      handleSatValMove(e.clientX, e.clientY);
    }
  };

  // Hue slider drag handler
  const handleHueMove = useCallback(
    (clientX: number) => {
      if (!hueBarRef.current) return;
      const rect = hueBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;

      emitColorChange({ ...hsv, h });
    },
    [hsv, emitColorChange]
  );

  const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleHueMove(e.clientX);
  };

  const handleHuePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0) {
      handleHueMove(e.clientX);
    }
  };

  // Alpha / Opacity slider drag handler
  const handleAlphaMove = useCallback(
    (clientX: number) => {
      if (!alphaBarRef.current) return;
      const rect = alphaBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const a = Math.round((x / rect.width) * 100) / 100;

      emitColorChange({ ...hsv, a });
    },
    [hsv, emitColorChange]
  );

  const handleAlphaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleAlphaMove(e.clientX);
  };

  const handleAlphaPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0) {
      handleAlphaMove(e.clientX);
    }
  };

  // HEX input submit
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    const parsed = parseColorToRgb(val);
    if (parsed) {
      const newHsv = rgbToHsv(parsed);
      setHsv(newHsv);
      setRgb(parsed);
      onChange(rgbToCss(parsed));
    }
  };

  // RGB inputs change
  const handleRgbFieldChange = (channel: keyof RgbColor, numVal: number) => {
    const clamped = channel === "a" ? Math.max(0, Math.min(1, numVal)) : Math.max(0, Math.min(255, Math.round(numVal)));
    const updatedRgb: RgbColor = { ...rgb, [channel]: clamped };
    const newHsv = rgbToHsv(updatedRgb);
    setRgb(updatedRgb);
    setHsv(newHsv);
    setHexInput(rgbToHex(updatedRgb));
    onChange(rgbToCss(updatedRgb));
  };

  // Eyedropper API support
  const handleEyeDropper = async () => {
    if ("EyeDropper" in window) {
      try {
        // @ts-expect-error - EyeDropper is supported in Chromium/modern browsers
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          const parsed = parseColorToRgb(result.sRGBHex);
          if (parsed) {
            const newHsv = rgbToHsv(parsed);
            emitColorChange(newHsv);
          }
        }
      } catch (err) {
        // User canceled eyedropper
      }
    }
  };

  // Preset palettes
  const PRESET_SWATCHES = [
    "#131418", "#191a21", "#1f212a", "#282a36", "#3f4458",
    "#6b7280", "#9ba3b2", "#e6e9f0", "#ffffff",
    "#818cf8", "#6366f1", "#4f46e5",
    "#10b981", "#059669", "#f59e0b", "#d97706",
    "#ef4444", "#dc2626", "#ec4899", "#8b5cf6",
  ];

  if (!isOpen) return null;

  // Pure hue color for 2D saturation/brightness background
  const pureHueRgb = hsvToRgb({ h: hsv.h, s: 1, v: 1, a: 1 });
  const pureHueHex = rgbToHex(pureHueRgb);
  const currentCss = rgbToCss(rgb);
  const originalCss = initialColor || color;
  const currentAlpha = hsv.a !== undefined ? hsv.a : 1;

  const content = (
    <div
      ref={popoverRef}
      id={`color-picker-popover-${tokenKey || "token"}`}
      role="dialog"
      aria-label={title || "Color Picker"}
      className="fixed z-[9999] w-[270px] rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-2xl p-3 flex flex-col gap-2.5 text-[var(--text-primary,#e6e9f0)] select-none animate-scaleIn backdrop-blur-md"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle,#1e2029)]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-3 h-3 rounded-full border border-black/20 shrink-0"
            style={{ backgroundColor: currentCss }}
          />
          <span className="text-xs font-bold truncate text-[var(--text-primary,#e6e9f0)]">
            {title || "Pick Color"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[var(--btn-hover,#262834)] text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
          title="Close Color Picker (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2D Saturation & Value Box */}
      <div
        ref={satValBoxRef}
        onPointerDown={handleSatValPointerDown}
        onPointerMove={handleSatValPointerMove}
        className="relative w-full h-32 rounded-xl cursor-crosshair overflow-hidden touch-none shadow-inner border border-black/20"
        style={{
          backgroundColor: pureHueHex,
          backgroundImage:
            "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
      >
        {/* Selection Indicator Ring */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_2px_1px_rgba(0,0,0,0.6)] pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: currentCss,
          }}
        />
      </div>

      {/* Hue Rainbow Slider */}
      <div className="flex flex-col gap-1.5">
        <div
          ref={hueBarRef}
          onPointerDown={handleHuePointerDown}
          onPointerMove={handleHuePointerMove}
          className="relative w-full h-4 rounded-full cursor-pointer touch-none shadow-inner border border-black/20"
          style={{
            background:
              "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
          }}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-black/30 shadow-[0_1px_3px_rgba(0,0,0,0.5)] pointer-events-none"
            style={{
              left: `${(hsv.h / 360) * 100}%`,
            }}
          />
        </div>

        {/* Alpha / Opacity Slider */}
        <div
          ref={alphaBarRef}
          onPointerDown={handleAlphaPointerDown}
          onPointerMove={handleAlphaPointerMove}
          className="relative w-full h-4 rounded-full cursor-pointer touch-none shadow-inner border border-black/20 overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)`,
            backgroundSize: "8px 8px",
            backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
            backgroundColor: "#444",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, transparent, ${pureHueHex})`,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-black/30 shadow-[0_1px_3px_rgba(0,0,0,0.5)] pointer-events-none"
            style={{
              left: `${currentAlpha * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Swatch Previews + Eyedropper + Reset */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle,#1e2029)]">
        <div className="flex items-center gap-1.5">
          {/* Active color vs Initial color swatch */}
          <div className="flex rounded-lg overflow-hidden border border-black/30 shadow-xs h-6 w-14 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (initialColor) {
                  const parsed = parseColorToRgb(initialColor);
                  if (parsed) emitColorChange(rgbToHsv(parsed));
                }
              }}
              className="w-1/2 h-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: originalCss }}
              title={`Original: ${originalCss} (Click to revert)`}
            />
            <div
              className="w-1/2 h-full"
              style={{ backgroundColor: currentCss }}
              title={`Current: ${currentCss}`}
            />
          </div>

          {"EyeDropper" in window && (
            <button
              type="button"
              onClick={handleEyeDropper}
              className="p-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer"
              title="Pick color from screen"
            >
              <Pipette className="w-3.5 h-3.5" />
            </button>
          )}

          {initialColor && (
            <button
              type="button"
              onClick={() => {
                const parsed = parseColorToRgb(initialColor);
                if (parsed) emitColorChange(rgbToHsv(parsed));
              }}
              className="p-1 rounded-lg bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-muted,#6b7280)] hover:text-amber-400 transition-colors cursor-pointer"
              title="Revert to initial token value"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mode Switcher: HEX vs RGB */}
        <button
          type="button"
          onClick={() => setInputMode(inputMode === "hex" ? "rgb" : "hex")}
          className="px-1.5 py-0.5 rounded-md bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[10px] font-mono font-bold text-[var(--accent-color,#818cf8)] transition-colors cursor-pointer"
        >
          {inputMode === "hex" ? "HEX" : "RGB"}
        </button>
      </div>

      {/* Inputs: HEX or RGB */}
      {inputMode === "hex" ? (
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--text-muted,#6b7280)]">
              #
            </span>
            <input
              type="text"
              value={hexInput.replace(/^#/, "")}
              onChange={(e) => handleHexInputChange({ ...e, target: { ...e.target, value: `#${e.target.value}` } })}
              placeholder="1f212a"
              className="w-full pl-6 pr-2 py-1 rounded-lg bg-[var(--input-bg,#16171e)] border border-[var(--input-border,#2a2d3c)] focus:border-[var(--input-focus,#818cf8)] text-xs font-mono text-[var(--text-primary,#e6e9f0)] focus:outline-hidden tracking-wider uppercase"
              spellCheck={false}
            />
          </div>
          <div className="w-14 shrink-0">
            <input
              type="text"
              value={`${Math.round(currentAlpha * 100)}%`}
              readOnly
              className="w-full px-1.5 py-1 rounded-lg bg-[var(--input-bg,#16171e)]/60 border border-[var(--input-border,#2a2d3c)] text-[11px] font-mono text-center text-[var(--text-muted,#6b7280)] focus:outline-hidden"
              title="Opacity percentage"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1 text-[10px]">
          <div>
            <label className="text-[9px] text-[var(--text-muted,#6b7280)] font-mono block text-center mb-0.5">R</label>
            <input
              type="number"
              min={0}
              max={255}
              value={rgb.r}
              onChange={(e) => handleRgbFieldChange("r", Number(e.target.value))}
              className="w-full px-1 py-0.5 rounded bg-[var(--input-bg,#16171e)] border border-[var(--input-border,#2a2d3c)] text-center text-xs font-mono text-[var(--text-primary,#e6e9f0)] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="text-[9px] text-[var(--text-muted,#6b7280)] font-mono block text-center mb-0.5">G</label>
            <input
              type="number"
              min={0}
              max={255}
              value={rgb.g}
              onChange={(e) => handleRgbFieldChange("g", Number(e.target.value))}
              className="w-full px-1 py-0.5 rounded bg-[var(--input-bg,#16171e)] border border-[var(--input-border,#2a2d3c)] text-center text-xs font-mono text-[var(--text-primary,#e6e9f0)] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="text-[9px] text-[var(--text-muted,#6b7280)] font-mono block text-center mb-0.5">B</label>
            <input
              type="number"
              min={0}
              max={255}
              value={rgb.b}
              onChange={(e) => handleRgbFieldChange("b", Number(e.target.value))}
              className="w-full px-1 py-0.5 rounded bg-[var(--input-bg,#16171e)] border border-[var(--input-border,#2a2d3c)] text-center text-xs font-mono text-[var(--text-primary,#e6e9f0)] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="text-[9px] text-[var(--text-muted,#6b7280)] font-mono block text-center mb-0.5">A%</label>
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(currentAlpha * 100)}
              onChange={(e) => handleRgbFieldChange("a", Number(e.target.value) / 100)}
              className="w-full px-1 py-0.5 rounded bg-[var(--input-bg,#16171e)] border border-[var(--input-border,#2a2d3c)] text-center text-xs font-mono text-[var(--text-primary,#e6e9f0)] focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Preset quick colors */}
      <div className="pt-1.5 border-t border-[var(--border-subtle,#1e2029)] flex flex-wrap gap-1 items-center justify-between">
        {PRESET_SWATCHES.map((sw, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              const parsed = parseColorToRgb(sw);
              if (parsed) emitColorChange(rgbToHsv(parsed));
            }}
            className="w-4.5 h-4.5 rounded-md border border-black/20 hover:scale-125 active:scale-95 transition-transform shadow-xs cursor-pointer"
            style={{ backgroundColor: sw }}
            title={sw}
          />
        ))}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
};
