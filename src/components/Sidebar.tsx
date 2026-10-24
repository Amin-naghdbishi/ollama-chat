import React, { useState, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Search,
  PanelLeftClose,
  PanelLeft,
  Settings,
  Trash2,
  Pin,
  PinOff,
  Edit2,
  Check,
  X,
  Cpu,
  Command,
  Star,
  Archive,
  Copy,
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  FolderInput,
  RotateCcw,
} from "lucide-react";
import { Conversation, ChatFolder, OllamaModel, ConnectionStatus } from "../types";
import { Language, getTranslation } from "../lib/i18n";

interface SidebarProps {
  conversations: Conversation[];
  folders?: ChatFolder[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePinConversation: (id: string) => void;
  onToggleFavoriteConversation?: (id: string) => void;
  onToggleArchiveConversation?: (id: string) => void;
  onDuplicateConversation?: (id: string) => void;
  onCreateFolder?: (name: string) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onToggleFolderCollapse?: (folderId: string) => void;
  onMoveConversationToFolder?: (conversationId: string, folderId?: string) => void;
  onExportConversation: (id: string, format: "json" | "md") => void;
  selectedModel?: string | null;
  models?: OllamaModel[];
  onOpenModelPicker?: () => void;
  onOpenSettings: () => void;
  onOpenContextExplorer?: () => void;
  onOpenTroubleshooter?: () => void;
  onOpenCommandPalette: () => void;
  connectionStatus?: ConnectionStatus;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  language?: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  folders = [],
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  onToggleFavoriteConversation,
  onToggleArchiveConversation,
  onDuplicateConversation,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderCollapse,
  onMoveConversationToFolder,
  selectedModel,
  models,
  onOpenModelPicker,
  onOpenSettings,
  onOpenContextExplorer,
  onOpenTroubleshooter,
  onOpenCommandPalette,
  connectionStatus,
  isCollapsed,
  onToggleCollapse,
  language = "en",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "favorites" | "folders" | "pinned" | "archived">("all");
  const [isChatManagementExpanded, setIsChatManagementExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem("ollama_chat_management_expanded");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [movingToFolderChatId, setMovingToFolderChatId] = useState<string | null>(null);

  // Folder creation & inline rename
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language, key);

  // Close open dropdown menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-menu-container")) {
        setOpenMenuId(null);
        setMovingToFolderChatId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartFolderCreate = () => {
    setIsCreatingFolder(true);
    setNewFolderName("");
  };

  const handleSaveNewFolder = () => {
    if (newFolderName.trim() && onCreateFolder) {
      onCreateFolder(newFolderName.trim());
    }
    setIsCreatingFolder(false);
    setNewFolderName("");
  };

  const startFolderRename = (folder: ChatFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const saveFolderRename = (folderId: string) => {
    if (editingFolderName.trim() && onRenameFolder) {
      onRenameFolder(folderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
  };

  const startRename = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setOpenMenuId(null);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // Filter conversations according to search & current tab
  const filteredConversations = conversations.filter((c) => {
    if (filterTab === "archived") {
      if (!c.isArchived) return false;
    } else {
      if (c.isArchived) return false;
      if (filterTab === "favorites" && !c.isFavorite) return false;
      if (filterTab === "pinned" && !c.isPinned) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (c.title.toLowerCase().includes(q)) return true;
    return c.messages.some((m) => m.content.toLowerCase().includes(q));
  });

  const unFolderedConversations = filteredConversations.filter((c) => !c.folderId);
  // Sort chronologically (newest first), keeping pinned at top in "all" or general list
  const sortedUnfolderedConversations = [...unFolderedConversations].sort((a, b) => {
    if (filterTab === "all") {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
    }
    const timeA = a.updatedAt || a.createdAt || 0;
    const timeB = b.updatedAt || b.createdAt || 0;
    return timeB - timeA;
  });

  if (isCollapsed) {
    return (
      <aside className="relative h-screen bg-[var(--bg-sidebar,#16171d)] border-r rtl:border-l rtl:border-r-0 border-[var(--border-color,#282a36)] flex flex-col items-center justify-between py-4 w-14 shrink-0 select-none z-20 transition-all duration-300">
        {/* Top: Expand Toggle + Essential New Chat Icon */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={onToggleCollapse}
            className="p-2.5 rounded-xl text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)] active:scale-95 transition-all cursor-pointer"
            title={t("expandSidebar")}
          >
            <PanelLeft className="w-5 h-5 text-[var(--accent-color,#818cf8)] rtl:rotate-180" />
          </button>

          <button
            onClick={onNewConversation}
            className="p-2.5 rounded-xl bg-[var(--accent-color,#818cf8)] hover:bg-[var(--accent-hover,#6366f1)] text-[var(--accent-text,#09090b)] active:scale-95 transition-all shadow-sm cursor-pointer"
            title={t("newChat")}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Bottom: Essential Settings Icon */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)] active:scale-95 transition-all cursor-pointer"
            title={t("settings")}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </aside>
    );
  }

  // Render conversation item component
  const renderConversationItem = (c: Conversation) => {
    const isActive = c.id === activeConversationId;
    const isEditingThis = editingId === c.id;
    const isMenuOpen = openMenuId === c.id;
    const isMovingFolder = movingToFolderChatId === c.id;

    return (
      <div
        key={c.id}
        className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
          isActive
            ? "bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] text-[var(--text-primary,#e6e9f0)] font-medium shadow-xs"
            : "text-[var(--text-secondary,#9ba3b2)] hover:bg-[var(--btn-hover,#262834)]/70 hover:text-[var(--text-primary,#e6e9f0)]"
        }`}
        onClick={() => onSelectConversation(c.id)}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1 rtl:mr-0 rtl:ml-1">
          <MessageSquare
            className={`w-3.5 h-3.5 shrink-0 ${
              isActive ? "text-[var(--accent-color,#818cf8)]" : "text-[var(--text-muted,#6b7280)]"
            }`}
          />

          {isEditingThis ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveRename(c.id)}
                className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-[15px] px-1.5 py-0.5 rounded border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                autoFocus
              />
              <button
                onClick={() => saveRename(c.id)}
                className="p-0.5 text-[var(--accent-color,#818cf8)] hover:opacity-80"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="truncate text-[15px] sm:text-[15.5px] leading-snug flex-1 text-left rtl:text-right font-normal">{c.title}</span>
          )}

          {/* Quick status indicators */}
          {!isEditingThis && (
            <div className="flex items-center gap-1 shrink-0">
              {c.isFavorite && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />}
              {c.isPinned && <Pin className="w-2.5 h-2.5 text-[var(--accent-color,#818cf8)] shrink-0" />}
              {c.isArchived && <Archive className="w-2.5 h-2.5 text-[var(--text-muted,#6b7280)] shrink-0" />}
            </div>
          )}
        </div>

        {/* ⋯ Menu Button & Dropdown */}
        {!isEditingThis && (
          <div className="relative dropdown-menu-container" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setOpenMenuId(isMenuOpen ? null : c.id);
                setMovingToFolderChatId(null);
              }}
              className="p-1 rounded text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)] transition-colors"
              title="Chat actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 top-6 w-48 bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] rounded-xl shadow-xl py-1.5 z-50 text-xs animate-fadeIn">
                {/* Rename */}
                <button
                  onClick={() => startRename(c)}
                  className="w-full text-left rtl:text-right px-3 py-1.5 hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] shrink-0" />
                  <span>{t("renameChat")}</span>
                </button>

                {/* Favorite */}
                {onToggleFavoriteConversation && (
                  <button
                    onClick={() => {
                      onToggleFavoriteConversation(c.id);
                      setOpenMenuId(null);
                    }}
                    className="w-full text-left rtl:text-right px-3 py-1.5 hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Star className={`w-3.5 h-3.5 shrink-0 ${c.isFavorite ? "text-amber-400 fill-amber-400" : "text-[var(--text-muted,#6b7280)]"}`} />
                    <span>{c.isFavorite ? (language === "fa" ? "حذف از علاقه‌مندی‌ها" : "Remove Favorite") : t("favoriteChat")}</span>
                  </button>
                )}

                {/* Pin */}
                <button
                  onClick={() => {
                    onTogglePinConversation(c.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full text-left rtl:text-right px-3 py-1.5 hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {c.isPinned ? (
                    <>
                      <PinOff className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] shrink-0" />
                      <span>{t("unpinChat")}</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] shrink-0" />
                      <span>{t("pinChat")}</span>
                    </>
                  )}
                </button>

                {/* Move to Folder Submenu */}
                {onMoveConversationToFolder && (
                  <div className="relative">
                    <button
                      onClick={() => setMovingToFolderChatId(isMovingFolder ? null : c.id)}
                      className="w-full text-left rtl:text-right px-3 py-1.5 hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FolderInput className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] shrink-0" />
                        <span>{t("moveToFolder")}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[var(--text-muted,#6b7280)] rtl:rotate-180 shrink-0" />
                    </button>

                    {isMovingFolder && (
                      <div className="bg-[var(--bg-secondary,#191a21)] border-t border-b border-[var(--border-color,#282a36)] py-1 my-1">
                        {c.folderId && (
                          <button
                            onClick={() => {
                              onMoveConversationToFolder(c.id, undefined);
                              setOpenMenuId(null);
                              setMovingToFolderChatId(null);
                            }}
                            className="w-full text-left rtl:text-right px-5 py-1 text-[11px] text-amber-400 hover:bg-[var(--btn-hover,#262834)] transition-colors cursor-pointer"
                          >
                            • {t("removeFromFolder")}
                          </button>
                        )}
                        {folders.length === 0 ? (
                          <div className="px-5 py-1 text-[10px] text-[var(--text-muted,#6b7280)] italic">{t("noFoldersCreated")}</div>
                        ) : (
                          folders.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                onMoveConversationToFolder(c.id, f.id);
                                setOpenMenuId(null);
                                setMovingToFolderChatId(null);
                              }}
                              className={`w-full text-left rtl:text-right px-5 py-1 text-[11px] hover:bg-[var(--btn-hover,#262834)] transition-colors flex items-center gap-1.5 cursor-pointer ${
                                c.folderId === f.id ? "text-[var(--accent-color,#818cf8)] font-bold" : "text-[var(--text-secondary,#9ba3b2)]"
                              }`}
                            >
                              <Folder className="w-3 h-3 text-[var(--text-muted,#6b7280)] shrink-0" />
                              <span className="truncate">{f.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Archive / Unarchive */}
                {onToggleArchiveConversation && (
                  <button
                    onClick={() => {
                      onToggleArchiveConversation(c.id);
                      setOpenMenuId(null);
                    }}
                    className="w-full text-left rtl:text-right px-3 py-1.5 hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {c.isArchived ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] shrink-0" />
                        <span>{t("unarchiveChat")}</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] shrink-0" />
                        <span>{t("archiveChat")}</span>
                      </>
                    )}
                  </button>
                )}

                {/* Duplicate */}
                {onDuplicateConversation && (
                  <button
                    onClick={() => {
                      onDuplicateConversation(c.id);
                      setOpenMenuId(null);
                    }}
                    className="w-full text-left rtl:text-right px-3 py-1.5 hover:bg-[var(--btn-hover,#262834)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] shrink-0" />
                    <span>{t("duplicateChat")}</span>
                  </button>
                )}

                <div className="my-1 border-t border-[var(--border-color,#282a36)]" />

                {/* Delete */}
                <button
                  onClick={() => {
                    onDeleteConversation(c.id);
                    setOpenMenuId(null);
                  }}
                  className="w-full text-left rtl:text-right px-3 py-1.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("deleteChat")}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="relative h-screen bg-[var(--bg-sidebar,#16171d)] border-r rtl:border-l rtl:border-r-0 border-[var(--border-color,#282a36)] flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none z-20 w-64 sm:w-72">
      {/* Top Header Row with Logo & Toggle Button */}
      <div className="flex items-center justify-between p-3.5 border-b border-[var(--border-color,#282a36)]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[var(--text-primary,#e6e9f0)] truncate">
            {t("appName")}
          </span>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)] transition-colors cursor-pointer"
          title={t("collapseSidebar")}
        >
          <PanelLeftClose className="w-5 h-5 rtl:rotate-180" />
        </button>
      </div>

      {/* Action Row: New Chat + New Folder */}
      <div className="p-3 flex items-center gap-2">
        <button
          onClick={onNewConversation}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-color,#818cf8)] hover:bg-[var(--accent-hover,#6366f1)] active:scale-[0.98] text-[var(--accent-text,#09090b)] font-bold px-3.5 py-2.5 text-xs shadow-xs transition-all cursor-pointer"
          title={t("newChat")}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t("newChat")}</span>
        </button>

        {onCreateFolder && (
          <button
            onClick={handleStartFolderCreate}
            className="p-2.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] transition-all cursor-pointer"
            title={t("createFolder")}
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
          </button>
        )}
      </div>

      {/* New Folder Inline Form */}
      {isCreatingFolder && (
        <div className="px-3 mb-2 animate-fadeIn">
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)]">
            <Folder className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveNewFolder()}
              placeholder={t("folderNamePlaceholder")}
              className="w-full bg-transparent text-xs text-[var(--text-primary,#e6e9f0)] focus:outline-none placeholder-[var(--text-muted,#6b7280)]"
              autoFocus
            />
            <button
              onClick={handleSaveNewFolder}
              className="p-1 text-emerald-400 hover:opacity-80 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsCreatingFolder(false)}
              className="p-1 text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Search Input & Filter Tabs */}
      <div className="px-3 mb-2 space-y-1.5">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] absolute left-3 rtl:left-auto rtl:right-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchChats")}
            className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] placeholder-[var(--text-muted,#6b7280)] text-xs pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-1.5 rounded-lg border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 rtl:right-auto rtl:left-2 text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Chat Management Collapsible Section */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              setIsChatManagementExpanded((prev) => {
                const next = !prev;
                try {
                  localStorage.setItem("ollama_chat_management_expanded", String(next));
                } catch {}
                return next;
              });
            }}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer rounded-lg hover:bg-[var(--bg-secondary,#191a21)]/60"
            title={isChatManagementExpanded ? "Collapse Chat Management" : "Expand Chat Management"}
          >
            <div className="flex items-center gap-1.5">
              <span>{t("chatManagement")}</span>
            </div>
            {isChatManagementExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 text-[var(--text-muted,#6b7280)]" />
            )}
          </button>

          {isChatManagementExpanded && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--bg-secondary,#191a21)]/90 rounded-xl border border-[var(--border-color,#282a36)] text-xs animate-fadeIn">
              <button
                onClick={() => setFilterTab("all")}
                className={`col-span-2 px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                  filterTab === "all"
                    ? "bg-[var(--btn-hover,#262834)] text-[var(--text-primary,#e6e9f0)] shadow-xs border border-[var(--border-color,#282a36)]"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]/50 border border-transparent"
                }`}
                title={t("allChats")}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] shrink-0" />
                  <span className="truncate">{t("allChats")}</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface,#1f212a)]">
                  {conversations.filter(c => !c.isArchived).length}
                </span>
              </button>

              <button
                onClick={() => setFilterTab("favorites")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                  filterTab === "favorites"
                    ? "bg-[var(--btn-hover,#262834)] text-amber-300 shadow-xs border border-amber-500/30"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]/50 border border-transparent"
                }`}
                title={t("favorites")}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
                  <span className="truncate">{t("favorites")}</span>
                </div>
                {conversations.filter(c => c.isFavorite && !c.isArchived).length > 0 && (
                  <span className="text-[10px] opacity-80 font-mono">
                    {conversations.filter(c => c.isFavorite && !c.isArchived).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilterTab("pinned")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                  filterTab === "pinned"
                    ? "bg-[var(--btn-hover,#262834)] text-[var(--accent-color,#818cf8)] shadow-xs border border-[var(--accent-color,#818cf8)]/30"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]/50 border border-transparent"
                }`}
                title={t("pinnedChats")}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Pin className="w-3.5 h-3.5 text-[var(--accent-color,#818cf8)] shrink-0" />
                  <span className="truncate">{t("pinnedChats")}</span>
                </div>
                {conversations.filter(c => c.isPinned && !c.isArchived).length > 0 && (
                  <span className="text-[10px] opacity-80 font-mono">
                    {conversations.filter(c => c.isPinned && !c.isArchived).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilterTab("folders")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                  filterTab === "folders"
                    ? "bg-[var(--btn-hover,#262834)] text-blue-300 shadow-xs border border-blue-500/30"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]/50 border border-transparent"
                }`}
                title={t("folders")}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">{t("folders")}</span>
                </div>
                {folders.length > 0 && (
                  <span className="text-[10px] opacity-80 font-mono">
                    {folders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilterTab("archived")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                  filterTab === "archived"
                    ? "bg-[var(--btn-hover,#262834)] text-[var(--text-primary,#e6e9f0)] shadow-xs border border-[var(--border-color,#282a36)]"
                    : "text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)]/50 border border-transparent"
                }`}
                title={t("archivedChats")}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Archive className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] shrink-0" />
                  <span className="truncate">{t("archivedChats")}</span>
                </div>
                {conversations.filter(c => c.isArchived).length > 0 && (
                  <span className="text-[10px] opacity-80 font-mono">
                    {conversations.filter(c => c.isArchived).length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conversation List / Folder View */}
      <div className="flex-1 overflow-y-auto px-2 space-y-3 custom-scrollbar text-xs">
        {filteredConversations.length === 0 && folders.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-muted,#6b7280)] text-xs">
            {searchQuery ? (language === "fa" ? "موردی یافت نشد" : "No matching chats") : (language === "fa" ? "هنوز گفتگویی ایجاد نشده" : "No chats yet")}
          </div>
        ) : (
          <>
            {/* Folder Sections */}
            {(filterTab === "all" || filterTab === "folders") && folders.length > 0 && (
              <div className="space-y-2 mb-3">
                <div className="px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted,#6b7280)] uppercase tracking-wider flex items-center gap-1">
                  <Folder className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <span>{t("folders")} ({folders.length})</span>
                </div>

                {folders.map((folder) => {
                  const folderChats = filteredConversations.filter((c) => c.folderId === folder.id);
                  const isFolderEditing = editingFolderId === folder.id;

                  return (
                    <div key={folder.id} className="rounded-xl border border-[var(--border-color,#282a36)] bg-[var(--bg-secondary,#191a21)]/80 overflow-hidden">
                      {/* Folder Header */}
                      <div className="flex items-center justify-between p-2 hover:bg-[var(--btn-hover,#262834)] transition-colors cursor-pointer group">
                        <div
                          className="flex items-center gap-2 flex-1 overflow-hidden"
                          onClick={() => onToggleFolderCollapse && onToggleFolderCollapse(folder.id)}
                        >
                          {folder.isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] rtl:rotate-180 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted,#6b7280)] shrink-0" />
                          )}
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />

                          {isFolderEditing ? (
                            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingFolderName}
                                onChange={(e) => setEditingFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && saveFolderRename(folder.id)}
                                className="bg-[var(--input-bg,#16171e)] text-xs text-[var(--text-primary,#e6e9f0)] px-1 py-0.5 rounded border border-[var(--input-border,#2a2d3c)] w-full focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => saveFolderRename(folder.id)}
                                className="p-0.5 text-emerald-400"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-semibold text-xs text-[var(--text-primary,#e6e9f0)] truncate flex-1 text-left rtl:text-right">
                              {folder.name}
                            </span>
                          )}

                          <span className="text-[10px] text-[var(--text-muted,#6b7280)] font-mono px-1.5 py-0.2 bg-[var(--bg-surface,#1f212a)] rounded-full">
                            {folderChats.length}
                          </span>
                        </div>

                        {/* Folder Action Controls */}
                        {!isFolderEditing && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startFolderRename(folder);
                              }}
                              className="p-1 text-[var(--text-muted,#6b7280)] hover:text-[var(--text-primary,#e6e9f0)]"
                              title="Rename folder"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {onDeleteFolder && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteFolder(folder.id);
                                }}
                                className="p-1 text-[var(--text-muted,#6b7280)] hover:text-red-400"
                                title="Delete folder"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Folder Contents */}
                      {!folder.isCollapsed && (
                        <div className="p-1.5 pl-3 rtl:pl-1.5 rtl:pr-3 space-y-1 bg-[var(--bg-primary,#131418)]/40 border-t border-[var(--border-color,#282a36)]">
                          {folderChats.length === 0 ? (
                            <div className="py-1.5 text-[10px] text-[var(--text-muted,#6b7280)] italic px-2 text-left rtl:text-right">
                              {t("noChatsInFolder")}
                            </div>
                          ) : (
                            folderChats.map((c) => renderConversationItem(c))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Un-Foldered or Category-Filtered Chats */}
            {filterTab !== "folders" && (
              <>
                {filterTab === "favorites" && (
                  <div className="px-2 py-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-amber-400 shrink-0" />
                    <span>{language === "fa" ? "گفتگوهای برگزیده" : "Favorite Chats"} ({filteredConversations.length})</span>
                  </div>
                )}
                {filterTab === "archived" && (
                  <div className="px-2 py-1 text-[10px] font-semibold text-[var(--accent-color,#818cf8)] uppercase tracking-wider flex items-center gap-1.5">
                    <Archive className="w-3 h-3 shrink-0" />
                    <span>{language === "fa" ? "گفتگوهای بایگانی شده" : "Archived Chats"} ({filteredConversations.length})</span>
                  </div>
                )}
                {sortedUnfolderedConversations.length === 0 && folders.length > 0 && filterTab === "all" ? (
                  <div className="p-3 text-center text-[var(--text-muted,#6b7280)] text-xs italic">
                    {language === "fa" ? "سایر گفتگوها در پوشه‌ها قرار دارند" : "All chats are organized in folders"}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sortedUnfolderedConversations.map((c) => renderConversationItem(c))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-[var(--border-color,#282a36)] bg-[var(--bg-secondary,#191a21)]">
        <div className="flex items-center justify-between">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 p-2 rounded-xl text-[var(--text-secondary,#9ba3b2)] hover:text-[var(--text-primary,#e6e9f0)] hover:bg-[var(--btn-hover,#262834)] transition-colors text-xs font-medium cursor-pointer"
            title={t("settings")}
          >
            <Settings className="w-4 h-4 text-[var(--accent-color,#818cf8)]" />
            <span>{t("settings")}</span>
          </button>

          <button
            onClick={onOpenCommandPalette}
            className="p-2 rounded-xl text-[var(--text-muted,#6b7280)] hover:text-[var(--text-secondary,#9ba3b2)] hover:bg-[var(--btn-hover,#262834)] transition-colors text-xs flex items-center gap-1.5 font-mono cursor-pointer"
            title={t("commandPalette")}
          >
            <Command className="w-3.5 h-3.5" />
            <span>K</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
