import { ImageVersion, ImageVersionHistory } from "../types";

const VERSIONS_STORAGE_KEY = "ollama_chat_image_versions";

class MediaService {
  private memoryStore: Record<string, ImageVersionHistory> = {};

  /**
   * Save media dataUrl to backend media storage (/api/media) with fallback
   */
  async saveMedia(
    dataUrl: string,
    filename?: string,
    metadata?: Record<string, any>
  ): Promise<{ id: string; url: string; filename: string }> {
    // If in browser, make HTTP POST to /api/media
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, filename, metadata }),
        });

        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn("Backend /api/media save unavailable, fallback to local:", err);
      }
    } else {
      // Running in Node.js (e.g. tests or scripts)
      try {
        const fs = await import("fs");
        const path = await import("path");
        const mediaDir = path.join(process.cwd(), "data", "media");
        if (!fs.existsSync(mediaDir)) {
          fs.mkdirSync(mediaDir, { recursive: true });
        }
        const fileId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const baseName = filename || `${fileId}.png`;
        const filePath = path.join(mediaDir, baseName);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        return {
          id: fileId,
          url: `/api/media/${baseName}`,
          filename: baseName,
        };
      } catch (nodeErr) {
        console.warn("Direct file save in Node failed:", nodeErr);
      }
    }

    // Fallback: generate local ID and use dataUrl directly
    const fallbackId = `media-local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: fallbackId,
      url: dataUrl,
      filename: filename || `${fallbackId}.png`,
    };
  }

  /**
   * Get all version histories from local persistent storage or in-memory fallback
   */
  private getAllHistories(): Record<string, ImageVersionHistory> {
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(VERSIONS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.memoryStore = parsed;
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse image version histories:", e);
      }
    }
    return this.memoryStore;
  }

  /**
   * Save all version histories to local persistent storage or in-memory fallback
   */
  private setAllHistories(histories: Record<string, ImageVersionHistory>): void {
    this.memoryStore = histories;
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(histories));
      } catch (e) {
        console.error("Failed to persist image version histories:", e);
      }
    }
  }

  /**
   * Get version history for a specific image
   */
  getVersionHistory(rootImageId: string): ImageVersionHistory | null {
    if (!rootImageId) return null;
    const all = this.getAllHistories();
    return all[rootImageId] || null;
  }

  /**
   * Initialize history for an image if it doesn't exist yet
   */
  initHistoryIfNeeded(
    rootImageId: string,
    initialUrl: string,
    initialDescription = "Original image"
  ): ImageVersionHistory {
    const existing = this.getVersionHistory(rootImageId);
    if (existing && existing.versions.length > 0) {
      return existing;
    }

    const initialVersion: ImageVersion = {
      id: `v1-${Date.now()}`,
      versionNumber: 1,
      imageUrl: initialUrl,
      editInstruction: initialDescription,
      toolUsed: "initial",
      timestamp: Date.now(),
    };

    const newHistory: ImageVersionHistory = {
      rootImageId,
      originalUrl: initialUrl,
      currentVersionId: initialVersion.id,
      versions: [initialVersion],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const all = this.getAllHistories();
    all[rootImageId] = newHistory;
    this.setAllHistories(all);

    return newHistory;
  }

  /**
   * Add a new version to the history of an image
   */
  addVersion(
    rootImageId: string,
    versionData: {
      imageUrl: string;
      editInstruction?: string;
      toolUsed?: "markup" | "erase" | "remove-bg" | "resize" | "edit-prompt" | "initial";
      parentVersionId?: string;
      width?: number;
      height?: number;
      hasMask?: boolean;
    }
  ): ImageVersion {
    const history = this.initHistoryIfNeeded(rootImageId, versionData.imageUrl);
    const nextNumber = history.versions.length + 1;

    const newVersion: ImageVersion = {
      id: `v${nextNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      versionNumber: nextNumber,
      imageUrl: versionData.imageUrl,
      parentVersionId: versionData.parentVersionId || history.currentVersionId,
      editInstruction: versionData.editInstruction || `Version ${nextNumber}`,
      toolUsed: versionData.toolUsed || "edit-prompt",
      timestamp: Date.now(),
      width: versionData.width,
      height: versionData.height,
      hasMask: versionData.hasMask,
    };

    history.versions.push(newVersion);
    history.currentVersionId = newVersion.id;
    history.updatedAt = Date.now();

    const all = this.getAllHistories();
    all[rootImageId] = history;
    this.setAllHistories(all);

    return newVersion;
  }

  /**
   * Set active version
   */
  setActiveVersion(rootImageId: string, versionId: string): ImageVersion | null {
    const history = this.getVersionHistory(rootImageId);
    if (!history) return null;

    const found = history.versions.find((v) => v.id === versionId);
    if (found) {
      history.currentVersionId = found.id;
      history.updatedAt = Date.now();
      const all = this.getAllHistories();
      all[rootImageId] = history;
      this.setAllHistories(all);
      return found;
    }
    return null;
  }
}

export const mediaService = new MediaService();
