import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Download,
  X,
  Pencil,
  MessageSquarePlus,
  Scissors,
  Eraser,
  Scaling,
  Sparkles,
  Check,
  History,
  Trash2,
  Undo2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { ChatComposer } from "./ChatComposer";
import { FileAttachment, ImageVersion, ImageVersionHistory } from "../types";
import { mediaService } from "../services/mediaService";
import { Language, getTranslation, isRtlText } from "../lib/i18n";

interface ImageComment {
  id: string;
  xPercent: number; // 0-100% relative to image
  yPercent: number;
  text: string;
}

interface ImageViewerModalProps {
  imageUrl: string;
  rootImageId?: string;
  title?: string;
  onClose: () => void;
  onDownload?: () => void;
  onApplyEdit?: (params: {
    sourceImageUrl: string;
    editInstruction: string;
    maskDataUrl?: string;
    referenceImages?: FileAttachment[];
    toolUsed?: "markup" | "erase" | "remove-bg" | "resize" | "edit-prompt";
  }) => Promise<string | null>; // Returns new image URL if generated
  isEditingGenerating?: boolean;
  editingProgress?: { step: number; totalSteps: number; percent?: number };
  onStopEditingGeneration?: () => void;
  selectedModel?: string | null;
  language?: Language;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl: initialImageUrl,
  rootImageId = `img-${Date.now()}`,
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
  const currentVersion =
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

  // Active Tool: null | "markup" | "comment" | "erase" | "resize"
  const [activeTool, setActiveTool] = useState<"markup" | "comment" | "erase" | "resize" | null>(null);

  // Markup Tool State
  const [markupColor, setMarkupColor] = useState<string>("#ef4444");
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  // Comments State
  const [comments, setComments] = useState<ImageComment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [pendingCommentPos, setPendingCommentPos] = useState<{ x: number; y: number } | null>(null);
  const [commentInputText, setCommentInputText] = useState("");

  // Resize Tool State
  const [targetWidth, setTargetWidth] = useState<number>(1024);
  const [targetHeight, setTargetHeight] = useState<number>(1024);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Status and Error messages
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeTool) {
          setActiveTool(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, activeTool]);

  // Sync canvas dimensions with rendered image
  const syncCanvasDimensions = useCallback(() => {
    const img = imageElementRef.current;
    const canvas = canvasRef.current;
    if (img && canvas) {
      canvas.width = img.naturalWidth || img.clientWidth || 800;
      canvas.height = img.naturalHeight || img.clientHeight || 800;
    }
  }, []);

  useEffect(() => {
    syncCanvasDimensions();
  }, [activeImageUrl, syncCanvasDimensions]);

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
    // If drawing or placing comment, do not initiate pan drag
    if (activeTool === "markup" || activeTool === "erase") {
      startDrawing(e);
      return;
    }
    if (activeTool === "comment") {
      handleImageClickForComment(e);
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === "markup" || activeTool === "erase") {
      draw(e);
      return;
    }
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    if (activeTool === "markup" || activeTool === "erase") {
      stopDrawing();
      return;
    }
    setIsDragging(false);
  };

  // Freehand Drawing / Masking functions
  const getCanvasCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (activeTool === "erase") {
      // Semi-transparent red overlay for inpainting mask visualization
      ctx.strokeStyle = "rgba(239, 68, 68, 0.75)";
      ctx.fillStyle = "rgba(239, 68, 68, 0.75)";
    } else {
      // Markup brush
      ctx.strokeStyle = markupColor;
      ctx.fillStyle = markupColor;
    }

    ctx.lineWidth = brushSize * 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.arc(x, y, (brushSize * 2.5) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Apply markup to create a new image version
  const handleApplyMarkupToVersion = async () => {
    const img = imageElementRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const merged = document.createElement("canvas");
    merged.width = canvas.width;
    merged.height = canvas.height;
    const mCtx = merged.getContext("2d");
    if (!mCtx) return;

    mCtx.drawImage(img, 0, 0, merged.width, merged.height);
    mCtx.drawImage(canvas, 0, 0);

    const mergedDataUrl = merged.toDataURL("image/png");
    const saved = await mediaService.saveMedia(mergedDataUrl, `markup_${Date.now()}.png`, {
      tool: "markup",
      rootImageId,
    });

    const newVer = mediaService.addVersion(rootImageId, {
      imageUrl: saved.url,
      editInstruction: "Freehand markup applied",
      toolUsed: "markup",
    });

    setVersionHistory(mediaService.getVersionHistory(rootImageId)!);
    clearCanvas();
    setActiveTool(null);
    setStatusMessage("Markup version saved.");
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Comments functions
  const handleImageClickForComment = (e: React.MouseEvent) => {
    const img = imageElementRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setPendingCommentPos({ x: xPercent, y: yPercent });
  };

  const handleSaveComment = () => {
    if (!pendingCommentPos || !commentInputText.trim()) {
      setPendingCommentPos(null);
      return;
    }

    const newComment: ImageComment = {
      id: `comment-${Date.now()}`,
      xPercent: pendingCommentPos.x,
      yPercent: pendingCommentPos.y,
      text: commentInputText.trim(),
    };

    setComments((prev) => [...prev, newComment]);
    setPendingCommentPos(null);
    setCommentInputText("");
    setStatusMessage("Comment added to image.");
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Remove BG Tool: Intelligent Canvas-based foreground cutout
  const handleRemoveBackground = async () => {
    const img = imageElementRef.current;
    if (!img) return;

    setStatusMessage("Removing background...");
    try {
      const procCanvas = document.createElement("canvas");
      const w = img.naturalWidth || img.width || 800;
      const h = img.naturalHeight || img.height || 800;
      procCanvas.width = w;
      procCanvas.height = h;
      const ctx = procCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Could not create canvas context");

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample 4 corner pixels to determine dominant background chroma
      const cornerSamples = [
        [data[0], data[1], data[2]],
        [data[(w - 1) * 4], data[(w - 1) * 4 + 1], data[(w - 1) * 4 + 2]],
        [data[(h - 1) * w * 4], data[(h - 1) * w * 4 + 1], data[(h - 1) * w * 4 + 2]],
        [data[((h - 1) * w + (w - 1)) * 4], data[((h - 1) * w + (w - 1)) * 4 + 1], data[((h - 1) * w + (w - 1)) * 4 + 2]],
      ];

      // Average background sample
      const bgR = Math.round(cornerSamples.reduce((a, b) => a + b[0], 0) / 4);
      const bgG = Math.round(cornerSamples.reduce((a, b) => a + b[1], 0) / 4);
      const bgB = Math.round(cornerSamples.reduce((a, b) => a + b[2], 0) / 4);

      const threshold = 38;
      const feather = 18;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Euclidean color distance from background
        const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

        if (dist < threshold) {
          data[i + 3] = 0; // Completely transparent
        } else if (dist < threshold + feather) {
          // Soft anti-aliased edge
          const alphaFactor = (dist - threshold) / feather;
          data[i + 3] = Math.round(data[i + 3] * alphaFactor);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const resultDataUrl = procCanvas.toDataURL("image/png");

      const saved = await mediaService.saveMedia(resultDataUrl, `nobg_${Date.now()}.png`, {
        tool: "remove-bg",
        rootImageId,
      });

      mediaService.addVersion(rootImageId, {
        imageUrl: saved.url,
        editInstruction: "Background removed",
        toolUsed: "remove-bg",
      });

      setVersionHistory(mediaService.getVersionHistory(rootImageId)!);
      setStatusMessage("Background removed successfully.");
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err: any) {
      setErrorMessage(`Background removal failed: ${err.message || err}`);
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  // Resize Tool: High-quality canvas dimension scaling
  const handleExecuteResize = async () => {
    const img = imageElementRef.current;
    if (!img) return;

    setIsResizing(true);
    setStatusMessage(`Resizing to ${targetWidth} × ${targetHeight}...`);

    try {
      const resizeCanvas = document.createElement("canvas");
      resizeCanvas.width = targetWidth;
      resizeCanvas.height = targetHeight;
      const ctx = resizeCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas context");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const resizedDataUrl = resizeCanvas.toDataURL("image/png");
      const saved = await mediaService.saveMedia(resizedDataUrl, `resized_${targetWidth}x${targetHeight}.png`, {
        tool: "resize",
        rootImageId,
        width: targetWidth,
        height: targetHeight,
      });

      mediaService.addVersion(rootImageId, {
        imageUrl: saved.url,
        editInstruction: `Resized to ${targetWidth} × ${targetHeight}`,
        toolUsed: "resize",
        width: targetWidth,
        height: targetHeight,
      });

      setVersionHistory(mediaService.getVersionHistory(rootImageId)!);
      setActiveTool(null);
      setStatusMessage(`Resized to ${targetWidth} × ${targetHeight}`);
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err: any) {
      setErrorMessage(`Resize failed: ${err.message || err}`);
      setTimeout(() => setErrorMessage(null), 3500);
    } finally {
      setIsResizing(false);
    }
  };

  // Download active image
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const a = document.createElement("a");
    a.href = activeImageUrl;
    a.download = `image-v${currentVersion.versionNumber}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Submit edit instruction via ChatComposer
  const handleComposerSendEdit = async (content: string, attachments: FileAttachment[]) => {
    if (!content.trim() && attachments.length === 0) return;

    // Check if mask exists on canvas
    let maskDataUrl: string | undefined = undefined;
    const canvas = canvasRef.current;
    if (canvas && (activeTool === "erase" || activeTool === "markup")) {
      // Check if canvas has any non-zero pixels
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const idata = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let hasPixels = false;
        for (let i = 3; i < idata.data.length; i += 4) {
          if (idata.data[i] > 10) {
            hasPixels = true;
            break;
          }
        }
        if (hasPixels) {
          // Generate binary inpaint mask: White where drawn, Black elsewhere
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = canvas.width;
          maskCanvas.height = canvas.height;
          const mCtx = maskCanvas.getContext("2d");
          if (mCtx) {
            mCtx.fillStyle = "#000000";
            mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
            mCtx.drawImage(canvas, 0, 0);

            // Turn any non-black pixel into solid white for standard ComfyUI inpaint
            const mData = mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            for (let i = 0; i < mData.data.length; i += 4) {
              if (mData.data[i + 3] > 10) {
                mData.data[i] = 255;
                mData.data[i + 1] = 255;
                mData.data[i + 2] = 255;
                mData.data[i + 3] = 255;
              }
            }
            mCtx.putImageData(mData, 0, 0);
            maskDataUrl = maskCanvas.toDataURL("image/png");
          }
        }
      }
    }

    // Incorporate any pinned comments into instruction
    let fullInstruction = content.trim();
    if (comments.length > 0) {
      const commentSummaries = comments
        .map((c, idx) => `[Region #${idx + 1} at ${Math.round(c.xPercent)}% x ${Math.round(c.yPercent)}%: "${c.text}"]`)
        .join("; ");
      fullInstruction += `\nTargeted regions: ${commentSummaries}`;
    }

    if (onApplyEdit) {
      try {
        const newResultUrl = await onApplyEdit({
          sourceImageUrl: activeImageUrl,
          editInstruction: fullInstruction,
          maskDataUrl,
          referenceImages: attachments,
          toolUsed: maskDataUrl ? "erase" : "edit-prompt",
        });

        if (newResultUrl) {
          mediaService.addVersion(rootImageId, {
            imageUrl: newResultUrl,
            editInstruction: fullInstruction,
            toolUsed: maskDataUrl ? "erase" : "edit-prompt",
            hasMask: Boolean(maskDataUrl),
          });
          setVersionHistory(mediaService.getVersionHistory(rootImageId)!);
          clearCanvas();
          setActiveTool(null);
          setComments([]);
          setStatusMessage("Edit completed successfully.");
          setTimeout(() => setStatusMessage(null), 3000);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to process image edit");
        setTimeout(() => setErrorMessage(null), 4000);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-fadeIn font-sans text-neutral-200"
      onClick={onClose}
    >
      {/* ====================================================================
          TOP TOOLBAR: Title / Version info on Left & Compact Controls on Right
         ==================================================================== */}
      <div
        className="w-full px-4 py-2.5 flex items-center justify-between bg-black/70 backdrop-blur-md border-b border-white/10 z-20 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Active Version Badge & Image Info */}
        <div className="flex items-center gap-2.5 text-xs text-neutral-300">
          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 font-mono text-[11px] font-semibold">
            v{currentVersion.versionNumber} of {versionHistory.versions.length}
          </span>
          <span className="font-medium text-neutral-200 truncate max-w-[220px] sm:max-w-xs">
            {currentVersion.editInstruction || title || "Image Workspace"}
          </span>
        </div>

        {/* Right: Compact Viewer Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom & View Controls Pill */}
          <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-700/60 rounded-xl p-1 shadow-lg">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-2 text-neutral-200 min-w-[50px] text-center">
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
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Reset Zoom & Fit (100%)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Download Current Version"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Close Button */}
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
          MAIN STAGE: Image Display with Pan, Zoom & Drawing/Comment Layer
         ==================================================================== */}
      <div
        className="flex-1 w-full flex items-center justify-center overflow-hidden relative min-h-0"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor:
            activeTool === "markup" || activeTool === "erase"
              ? "crosshair"
              : activeTool === "comment"
              ? "cell"
              : isDragging
              ? "grabbing"
              : "grab",
        }}
      >
        {/* Transformable Image Container */}
        <div
          className="relative transition-transform duration-75 ease-out select-none flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Visual Image Element */}
          <img
            ref={imageElementRef}
            src={activeImageUrl}
            alt={title || "Editable Visual"}
            draggable={false}
            onLoad={syncCanvasDimensions}
            className="max-h-[60vh] max-w-[85vw] object-contain rounded-xl shadow-2xl pointer-events-none border border-white/10"
          />

          {/* Freehand Drawing & Mask Canvas Overlay */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full rounded-xl ${
              activeTool === "markup" || activeTool === "erase" ? "pointer-events-auto" : "pointer-events-none"
            }`}
          />

          {/* Render Comment Pins */}
          {comments.map((comment, index) => (
            <div
              key={comment.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              style={{ left: `${comment.xPercent}%`, top: `${comment.yPercent}%` }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveCommentId(comment.id === activeCommentId ? null : comment.id);
              }}
            >
              <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold text-xs flex items-center justify-center shadow-lg border-2 border-white animate-scaleIn">
                {index + 1}
              </div>

              {/* Comment Tooltip / Popover */}
              {activeCommentId === comment.id && (
                <div className="absolute left-full top-0 ml-2 z-30 p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl w-48 text-xs text-white space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase">
                    <span>Note #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setComments((prev) => prev.filter((c) => c.id !== comment.id))}
                      className="text-neutral-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="leading-snug text-neutral-200">{comment.text}</p>
                </div>
              )}
            </div>
          ))}

          {/* New Comment Input Popover on Image */}
          {pendingCommentPos && (
            <div
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-neutral-900 border border-amber-500/70 shadow-2xl w-60 space-y-2 animate-scaleIn"
              style={{ left: `${pendingCommentPos.x}%`, top: `${pendingCommentPos.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[11px] font-bold text-amber-400 block">Add Region Note</span>
              <textarea
                value={commentInputText}
                onChange={(e) => setCommentInputText(e.target.value)}
                placeholder="e.g. Change hair color to dark brown..."
                rows={2}
                autoFocus
                className="w-full p-2 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-hidden resize-none"
              />
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingCommentPos(null)}
                  className="px-2 py-1 rounded-lg text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveComment}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold"
                >
                  Save Pin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status or Error Notification Pill */}
      {(statusMessage || errorMessage) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-fadeIn pointer-events-none">
          <div
            className={`px-4 py-2 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-xl border ${
              errorMessage
                ? "bg-rose-950/90 text-rose-200 border-rose-800"
                : "bg-neutral-900/90 text-white border-white/20"
            }`}
          >
            {errorMessage ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
            <span>{errorMessage || statusMessage}</span>
          </div>
        </div>
      )}

      {/* Real-time Generation Progress Bar inside Viewer */}
      {isEditingGenerating && (
        <div className="w-full max-w-xl mx-auto px-4 py-2 z-20 animate-fadeIn">
          <div className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-700 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                <span>Applying visual edits with {selectedModel || "ComfyUI"}...</span>
              </span>
              <span className="font-mono text-violet-300">
                {editingProgress?.percent !== undefined
                  ? `${editingProgress.percent}%`
                  : editingProgress?.step
                  ? `${editingProgress.step} / ${editingProgress.totalSteps}`
                  : "Processing..."}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all duration-200"
                style={{ width: `${editingProgress?.percent ?? 45}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TOOLBAR 1: ACTIVE TOOL CONTROLS (Colors, Brush Sizes, Resize, Apply)
         ==================================================================== */}
      {activeTool === "markup" && (
        <div
          className="mx-auto mb-2 px-3 py-1.5 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 shadow-xl flex items-center gap-3 text-xs z-20 animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Color Palettes */}
          <div className="flex items-center gap-1.5">
            {["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ffffff"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setMarkupColor(c)}
                className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                  markupColor === c ? "scale-125 border-white shadow-md ring-1 ring-white" : "border-black/40 hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-neutral-700" />

          {/* Brush Size */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
            <span>Size</span>
            <input
              type="range"
              min="2"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(+e.target.value)}
              className="w-16 accent-white"
            />
          </div>

          <div className="h-4 w-px bg-neutral-700" />

          <button
            type="button"
            onClick={clearCanvas}
            className="text-neutral-400 hover:text-white transition-colors"
            title="Clear Markup"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={handleApplyMarkupToVersion}
            className="px-2.5 py-1 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors shadow-xs"
          >
            Save Markup
          </button>
        </div>
      )}

      {activeTool === "erase" && (
        <div
          className="mx-auto mb-2 px-3 py-1.5 rounded-2xl bg-neutral-900/90 border border-rose-500/40 shadow-xl flex items-center gap-3 text-xs z-20 animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-rose-400 font-semibold text-[11px] flex items-center gap-1.5">
            <Eraser className="w-3.5 h-3.5" />
            <span>Brush region to edit / inpaint</span>
          </span>

          <div className="h-4 w-px bg-neutral-700" />

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
            <span>Brush</span>
            <input
              type="range"
              min="4"
              max="40"
              value={brushSize}
              onChange={(e) => setBrushSize(+e.target.value)}
              className="w-20 accent-rose-500"
            />
          </div>

          <div className="h-4 w-px bg-neutral-700" />

          <button
            type="button"
            onClick={clearCanvas}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Clear Mask
          </button>
        </div>
      )}

      {activeTool === "resize" && (
        <div
          className="mx-auto mb-2 p-3 rounded-2xl bg-neutral-900/95 border border-neutral-700 shadow-2xl flex flex-col gap-2.5 text-xs z-20 animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 font-semibold text-neutral-200">
            <span>Resize Dimensions</span>
            <span className="font-mono text-[11px] text-neutral-400">
              {targetWidth} × {targetHeight}
            </span>
          </div>

          {/* Aspect Presets */}
          <div className="flex items-center gap-1.5">
            {[
              { label: "1:1 (Square)", w: 1024, h: 1024 },
              { label: "16:9 (Landscape)", w: 1536, h: 864 },
              { label: "9:16 (Portrait)", w: 864, h: 1536 },
              { label: "4:3 (Photo)", w: 1152, h: 864 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setTargetWidth(p.w);
                  setTargetHeight(p.h);
                }}
                className={`px-2 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
                  targetWidth === p.w && targetHeight === p.h
                    ? "bg-white text-black border-white font-bold"
                    : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTool(null)}
              className="px-2.5 py-1 text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteResize}
              disabled={isResizing}
              className="px-3 py-1 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-colors"
            >
              Apply Resize
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TOOLBAR 2: HORIZONTAL EDITING TOOLS BAR (Under the Image)
          Markup | Comment | Remove BG | Erase | Resize
         ==================================================================== */}
      <div
        className="w-full flex items-center justify-center gap-1 sm:gap-2 px-4 py-2 z-20 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-700/60 rounded-2xl p-1 shadow-xl backdrop-blur-md">
          {/* 1. Markup */}
          <button
            type="button"
            onClick={() => {
              clearCanvas();
              setActiveTool(activeTool === "markup" ? null : "markup");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === "markup"
                ? "bg-white text-black shadow-xs font-bold"
                : "text-neutral-300 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Markup</span>
          </button>

          {/* 2. Comment */}
          <button
            type="button"
            onClick={() => setActiveTool(activeTool === "comment" ? null : "comment")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === "comment"
                ? "bg-white text-black shadow-xs font-bold"
                : "text-neutral-300 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Comment</span>
            {comments.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                {comments.length}
              </span>
            )}
          </button>

          {/* 3. Remove BG */}
          <button
            type="button"
            onClick={handleRemoveBackground}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Remove BG</span>
          </button>

          {/* 4. Erase / Inpaint Mask */}
          <button
            type="button"
            onClick={() => {
              clearCanvas();
              setActiveTool(activeTool === "erase" ? null : "erase");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === "erase"
                ? "bg-rose-500 text-white shadow-xs font-bold"
                : "text-neutral-300 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Erase</span>
          </button>

          {/* 5. Resize */}
          <button
            type="button"
            onClick={() => setActiveTool(activeTool === "resize" ? null : "resize")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === "resize"
                ? "bg-white text-black shadow-xs font-bold"
                : "text-neutral-300 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Scaling className="w-3.5 h-3.5" />
            <span>Resize</span>
          </button>
        </div>

        {/* Compact Version History Pill / Stepper */}
        {versionHistory.versions.length > 1 && (
          <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-700/60 rounded-2xl p-1 shadow-xl backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 flex items-center gap-1">
              <History className="w-3 h-3" />
              <span>Versions</span>
            </span>
            {versionHistory.versions.map((ver) => (
              <button
                key={ver.id}
                type="button"
                onClick={() => {
                  mediaService.setActiveVersion(rootImageId, ver.id);
                  setVersionHistory(mediaService.getVersionHistory(rootImageId)!);
                }}
                className={`px-2 py-1 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                  ver.id === currentVersion.id
                    ? "bg-white text-black font-bold shadow-xs"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
                title={ver.editInstruction || `Version ${ver.versionNumber}`}
              >
                v{ver.versionNumber}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ====================================================================
          CRITICAL UI REQUIREMENT: REUSE THE MAIN CHAT COMPOSER EXACTLY
          The ONLY placeholder text must be: "Describe edits..."
          No extra labels, instructions, helper text, or prompt headings.
         ==================================================================== */}
      <div className="w-full shrink-0 z-20" onClick={(e) => e.stopPropagation()}>
        <ChatComposer
          placeholder="Describe edits..."
          onSendMessage={handleComposerSendEdit}
          onStopGeneration={onStopEditingGeneration || (() => {})}
          isGenerating={isEditingGenerating}
          selectedModel={selectedModel || null}
          enableThinking={false}
          onToggleThinking={() => {}}
          language={language}
          className="w-full max-w-3xl xl:max-w-4xl mx-auto px-3 sm:px-6 pb-3"
        />
      </div>
    </div>
  );
};
