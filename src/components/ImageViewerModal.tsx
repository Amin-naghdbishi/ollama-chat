import React, { useState, useRef, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Download,
  X,
  History,
  AlertCircle,
} from "lucide-react";
import { ChatComposer } from "./ChatComposer";
import { FileAttachment, ImageVersion, ImageVersionHistory } from "../types";
import { mediaService } from "../services/mediaService";
import { Language, getTranslation } from "../lib/i18n";

interface ImageViewerModalProps {
  imageUrl: string;
  rootImageId?: string;
  sourceMessageId?: string;
  title?: string;
  onClose: () => void;
  onDownload?: () => void;
  onApplyEdit?: (params: {
    sourceImageUrl: string;
    sourceVersionId?: string;
    sourceMessageId?: string;
    sourceTitle?: string;
    editInstruction: string;
    referenceImages?: FileAttachment[];
  }) => Promise<string | null>;
  isEditingGenerating?: boolean;
  editingProgress?: { step: number; totalSteps: number; percent?: number };
  onStopEditingGeneration?: () => void;
  selectedModel?: string | null;
  language?: Language;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl: initialImageUrl,
  rootImageId = `img-${Date.now()}`,
  sourceMessageId,
  title,
  onClose,
  onDownload,
  onApplyEdit,
  isEditingGenerating = false,
  editingProgress,
  onStopEditingGeneration,
  selectedModel,
  language = "en",
}) => {
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  // Version History State
  const [versionHistory, setVersionHistory] = useState<ImageVersionHistory>(() =>
    mediaService.initHistoryIfNeeded(rootImageId, initialImageUrl, title || "Original visual")
  );

  const currentVersion: ImageVersion =
    versionHistory.versions.find((v) => v.id === versionHistory.currentVersionId) ||
    versionHistory.versions[versionHistory.versions.length - 1] || {
      id: "v1",
      versionNumber: 1,
      imageUrl: initialImageUrl,
      timestamp: Date.now(),
    };

  const activeImageUrl = currentVersion.imageUrl || initialImageUrl;

  // Pan & Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Pan & Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(5, +(prev * 1.25).toFixed(2)));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.25, +(prev / 1.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleDownloadImage = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const a = document.createElement("a");
    a.href = activeImageUrl;
    a.download = `image-v${currentVersion.versionNumber}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleComposerSendEdit = async (
    text: string,
    attachments?: FileAttachment[]
  ) => {
    if (!text.trim() || !onApplyEdit) return;

    setErrorMessage(null);
    try {
      const newUrl = await onApplyEdit({
        sourceImageUrl: activeImageUrl,
        sourceVersionId: currentVersion.id,
        sourceMessageId,
        sourceTitle: title || `Version ${currentVersion.versionNumber}`,
        editInstruction: text.trim(),
        referenceImages: attachments,
      });

      if (newUrl) {
        mediaService.addVersion(rootImageId, {
          imageUrl: newUrl,
          editInstruction: text.trim(),
          parentVersionId: currentVersion.id,
          toolUsed: "edit-prompt",
        });
        const updated = mediaService.getVersionHistory(rootImageId);
        if (updated) {
          setVersionHistory(updated);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-fadeIn overflow-hidden"
      onClick={onClose}
    >
      {/* ====================================================================
          TOP TOOLBAR: Title & Compact Controls (Zoom, Rotate, Reset, Download, Close)
         ==================================================================== */}
      <div
        className="w-full px-4 py-2.5 flex items-center justify-between bg-black/70 backdrop-blur-md border-b border-white/10 z-20 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 truncate max-w-sm sm:max-w-md">
          <span className="font-semibold text-white">
            {title || "Image Viewer"}
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
            v{currentVersion.versionNumber}
          </span>
        </div>

        {/* Compact Top-Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-700/60 rounded-xl p-1 shadow-lg">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs px-2 text-neutral-200 min-w-[50px] text-center select-none">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-neutral-700/60 mx-0.5" />

            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition-colors cursor-pointer shadow-lg"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ====================================================================
          UPPER-LEFT CORNER: Vertical Image Version Strip
         ==================================================================== */}
      <div
        className="absolute top-16 left-4 z-30 flex flex-col gap-1.5 max-h-[calc(100vh-220px)] overflow-y-auto p-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl select-none custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-white/10">
          <History className="w-3 h-3 text-neutral-300" />
          <span>v({versionHistory.versions.length})</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {versionHistory.versions.map((ver) => {
            const isActive = ver.id === currentVersion.id;
            return (
              <button
                key={ver.id}
                type="button"
                onClick={() => {
                  mediaService.setActiveVersion(rootImageId, ver.id);
                  const updated = mediaService.getVersionHistory(rootImageId);
                  if (updated) setVersionHistory(updated);
                }}
                className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all duration-150 flex items-center justify-center shrink-0 ${
                  isActive
                    ? "ring-2 ring-white border-2 border-white shadow-lg scale-105"
                    : "border border-white/20 hover:border-white/60 opacity-75 hover:opacity-100 hover:scale-102"
                }`}
                title={ver.editInstruction || `Version ${ver.versionNumber}`}
              >
                <img
                  src={ver.imageUrl}
                  alt={`Version ${ver.versionNumber}`}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <span
                  className={`absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                    isActive ? "bg-white text-black" : "bg-black/75 text-white"
                  }`}
                >
                  v{ver.versionNumber}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          MAIN IMAGE CANVAS STAGE
         ==================================================================== */}
      <div
        className="flex-1 w-full flex items-center justify-center overflow-hidden relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div
          className="transition-transform duration-75 ease-out select-none relative flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={activeImageUrl}
            alt="Full size preview"
            draggable={false}
            className="max-h-[75vh] max-w-[85vw] object-contain rounded-xl shadow-2xl pointer-events-none select-none border border-white/10"
          />
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          className="mx-auto mb-2 px-4 py-2 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 max-w-lg z-20 shadow-lg animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="truncate">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:text-white ml-auto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Real-time Progress Bar if generating */}
      {isEditingGenerating && (
        <div
          className="mx-auto mb-2 w-full max-w-xl px-4 py-2 rounded-xl bg-neutral-900/90 border border-neutral-700 text-xs text-neutral-300 flex flex-col gap-1.5 z-20 shadow-lg animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span>Applying image edits...</span>
            {editingProgress && (
              <span>
                Step {editingProgress.step} / {editingProgress.totalSteps}{" "}
                {editingProgress.percent ? `(${editingProgress.percent}%)` : ""}
              </span>
            )}
          </div>
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
              style={{
                width: `${
                  editingProgress?.percent ??
                  (editingProgress && editingProgress.totalSteps > 0
                    ? Math.round((editingProgress.step / editingProgress.totalSteps) * 100)
                    : 45)
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ====================================================================
          CRITICAL UI REQUIREMENT: REUSE THE MAIN CHAT COMPOSER EXACTLY
          The ONLY placeholder text must be: "Describe edits..."
          Moved upward closer to the image, no 5-tool toolbar.
         ==================================================================== */}
      <div className="w-full shrink-0 z-20 pt-1 pb-3" onClick={(e) => e.stopPropagation()}>
        <ChatComposer
          placeholder="Describe edits..."
          onSendMessage={handleComposerSendEdit}
          onStopGeneration={onStopEditingGeneration || (() => {})}
          isGenerating={isEditingGenerating}
          selectedModel={selectedModel || null}
          enableThinking={false}
          onToggleThinking={() => {}}
          language={language}
          className="w-full max-w-3xl xl:max-w-4xl mx-auto px-3 sm:px-6"
        />
      </div>
    </div>
  );
};
