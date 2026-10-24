import React, { useState } from "react";
import {
  Server,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Cpu,
  Layers,
  Globe,
  Radio,
  ExternalLink,
  Sliders,
  Check,
  X,
  Zap,
} from "lucide-react";
import { AIProvider, AppSettings, ConnectionStatus, ProviderType } from "../../types";
import { ProviderService } from "../../services/providerService";

interface ProviderManagementTabProps {
  settings: AppSettings;
  providers: AIProvider[];
  onProvidersChange: (providers: AIProvider[]) => void;
  onRefreshModels: () => void;
}

export const ProviderManagementTab: React.FC<ProviderManagementTabProps> = ({
  settings,
  providers,
  onProvidersChange,
  onRefreshModels,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [providerToDelete, setProviderToDelete] = useState<AIProvider | null>(null);

  // Testing status per provider ID
  const [testingStatus, setTestingStatus] = useState<Record<string, ConnectionStatus | "loading">>({});

  // Form State for Add / Edit
  const [formType, setFormType] = useState<ProviderType>("ollama");
  const [formName, setFormName] = useState("");
  const [formEndpoint, setFormEndpoint] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formOrgId, setFormOrgId] = useState("");
  const [formConnectionMode, setFormConnectionMode] = useState<"proxy" | "direct">("proxy");
  const [showApiKey, setShowApiKey] = useState(false);
  const [formTestResult, setFormTestResult] = useState<ConnectionStatus | null>(null);
  const [isTestingForm, setIsTestingForm] = useState(false);

  const resetForm = (type: ProviderType = "ollama") => {
    setFormType(type);
    setFormTestResult(null);
    setShowApiKey(false);

    if (type === "ollama") {
      setFormName("Ollama Server");
      setFormEndpoint("http://127.0.0.1:11434");
      setFormApiKey("");
      setFormOrgId("");
      setFormConnectionMode("proxy");
    } else if (type === "openrouter") {
      setFormName("OpenRouter");
      setFormEndpoint("https://openrouter.ai/api/v1");
      setFormApiKey("");
      setFormOrgId("");
      setFormConnectionMode("proxy");
    } else if (type === "openai") {
      setFormName("Local OpenAI-Compatible Server");
      setFormEndpoint("http://127.0.0.1:8000/v1");
      setFormApiKey("");
      setFormOrgId("");
      setFormConnectionMode("proxy");
    } else {
      setFormName("Custom LLM Gateway");
      setFormEndpoint("http://127.0.0.1:1234/v1");
      setFormApiKey("");
      setFormOrgId("");
      setFormConnectionMode("proxy");
    }
  };

  const handleOpenAddModal = (type: ProviderType = "ollama") => {
    resetForm(type);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (provider: AIProvider) => {
    setEditingProvider(provider);
    setFormType(provider.type);
    setFormName(provider.name);
    setFormEndpoint(provider.endpoint);
    setFormApiKey(provider.apiKey || "");
    setFormOrgId(provider.organizationId || "");
    setFormConnectionMode(provider.connectionMode || "proxy");
    setShowApiKey(false);
    setFormTestResult(null);
  };

  const handleTestSpecificProvider = async (provider: AIProvider) => {
    setTestingStatus((prev) => ({ ...prev, [provider.id]: "loading" }));
    const result = await ProviderService.testConnection(provider, settings);
    setTestingStatus((prev) => ({ ...prev, [provider.id]: result }));

    // Update status in provider list
    ProviderService.updateProvider(provider.id, {
      status: result.isConnected ? "connected" : "error",
      lastChecked: Date.now(),
      lastError: result.error,
    });
    onProvidersChange(ProviderService.getProviders());
  };

  const handleTestModalForm = async () => {
    setIsTestingForm(true);
    setFormTestResult(null);

    const tempProvider: AIProvider = {
      id: "temp-test",
      name: formName || "Test Provider",
      type: formType,
      endpoint: formEndpoint,
      apiKey: formApiKey,
      organizationId: formOrgId,
      isEnabled: true,
      connectionMode: formConnectionMode,
      capabilities: {
        chat: true,
        streaming: true,
        modelListing: true,
        modelDiscovery: formType === "ollama",
        modelDownload: formType === "ollama",
        modelDeletion: formType === "ollama",
        vision: true,
        thinking: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = await ProviderService.testConnection(tempProvider, settings);
    setIsTestingForm(false);
    setFormTestResult(result);
  };

  const handleSaveAddProvider = () => {
    if (!formEndpoint.trim()) return;

    ProviderService.addProvider({
      name: formName.trim() || `${formType.toUpperCase()} Provider`,
      type: formType,
      endpoint: formEndpoint.trim(),
      apiKey: formApiKey.trim() || undefined,
      organizationId: formOrgId.trim() || undefined,
      isEnabled: true,
      connectionMode: formConnectionMode,
      capabilities: {
        chat: true,
        streaming: true,
        modelListing: true,
        modelDiscovery: formType === "ollama",
        modelDownload: formType === "ollama",
        modelDeletion: formType === "ollama",
        vision: true,
        thinking: true,
      },
      status: "connected",
    });

    onProvidersChange(ProviderService.getProviders());
    setIsAddModalOpen(false);
    onRefreshModels();
  };

  const handleSaveEditProvider = () => {
    if (!editingProvider || !formEndpoint.trim()) return;

    ProviderService.updateProvider(editingProvider.id, {
      name: formName.trim() || editingProvider.name,
      type: formType,
      endpoint: formEndpoint.trim(),
      apiKey: formApiKey.trim() || undefined,
      organizationId: formOrgId.trim() || undefined,
      connectionMode: formConnectionMode,
    });

    onProvidersChange(ProviderService.getProviders());
    setEditingProvider(null);
    onRefreshModels();
  };

  const handleToggleProvider = (id: string, isEnabled: boolean) => {
    ProviderService.updateProvider(id, { isEnabled });
    onProvidersChange(ProviderService.getProviders());
    onRefreshModels();
  };

  const handleDeleteConfirm = () => {
    if (!providerToDelete) return;
    ProviderService.deleteProvider(providerToDelete.id);
    onProvidersChange(ProviderService.getProviders());
    setProviderToDelete(null);
    onRefreshModels();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle,#1e2029)] pb-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary,#e6e9f0)] flex items-center gap-2">
            <Server className="w-5 h-5 text-[var(--accent-color,#818cf8)]" />
            <span>Provider Management</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary,#9ba3b2)] mt-0.5">
            Connect Ollama, local vLLM / LM Studio instances, OpenRouter, or OpenAI-compatible backends.
          </p>
        </div>

        {/* Add Provider Dropdown / Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenAddModal("ollama")}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-color,#818cf8)] hover:brightness-110 text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Provider</span>
          </button>
        </div>
      </div>

      {/* Configured Providers List */}
      <div className="space-y-3">
        {providers.map((provider) => {
          const test = testingStatus[provider.id];
          const isTesting = test === "loading";
          const status = typeof test === "object" ? (test.isConnected ? "connected" : "error") : provider.status || "disconnected";

          return (
            <div
              key={provider.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                provider.isEnabled
                  ? "bg-[var(--bg-surface,#1f212a)] border-[var(--border-color,#282a36)] shadow-xs"
                  : "bg-[var(--bg-surface,#1f212a)]/40 border-[var(--border-color,#282a36)] opacity-60"
              }`}
            >
              {/* Left Info */}
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    provider.isEnabled
                      ? "bg-[var(--btn-bg,#1c1e27)] border-[var(--border-color,#282a36)] text-[var(--accent-color,#818cf8)]"
                      : "bg-[var(--bg-primary,#131418)] border-[var(--border-subtle,#1e2029)] text-[var(--text-muted,#6b7280)]"
                  }`}
                >
                  <Server className="w-5 h-5" />
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-[var(--text-primary,#e6e9f0)]">
                      {provider.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--bg-primary,#131418)] border border-[var(--border-color,#282a36)] text-[10px] uppercase font-mono font-bold text-[var(--text-secondary,#9ba3b2)]">
                      {provider.type}
                    </span>
                    {provider.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--accent-color,#818cf8)]/20 text-[var(--accent-color,#818cf8)] text-[10px] font-bold">
                        DEFAULT
                      </span>
                    )}

                    {/* Status Pill */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        status === "connected"
                          ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
                          : status === "error"
                          ? "bg-red-950/40 text-red-300 border border-red-800/60"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          status === "connected"
                            ? "bg-emerald-400"
                            : status === "error"
                            ? "bg-red-400"
                            : "bg-zinc-500"
                        }`}
                      />
                      <span>
                        {status === "connected"
                          ? "Online"
                          : status === "error"
                          ? "Error / Offline"
                          : "Inactive"}
                      </span>
                    </span>
                  </div>

                  {/* Endpoint URL & details */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted,#6b7280)] font-mono mt-1">
                    <span className="truncate max-w-xs sm:max-w-md">{provider.endpoint}</span>
                    {provider.modelCount !== undefined && (
                      <>
                        <span>•</span>
                        <span>{provider.modelCount} models loaded</span>
                      </>
                    )}
                    {provider.apiKey && (
                      <>
                        <span>•</span>
                        <span>API Key configured</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {/* Enable / Disable Toggle */}
                <label className="relative inline-flex items-center cursor-pointer mr-1">
                  <input
                    type="checkbox"
                    checked={provider.isEnabled}
                    onChange={(e) => handleToggleProvider(provider.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-[var(--input-bg,#16171e)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--accent-color,#818cf8)] border border-[var(--border-color,#282a36)]" />
                </label>

                {/* Test Connection Button */}
                <button
                  type="button"
                  onClick={() => handleTestSpecificProvider(provider)}
                  disabled={isTesting}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Test Connection to Provider"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-[var(--accent-color,#818cf8)]" : ""}`} />
                  <span>Test</span>
                </button>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(provider)}
                  className="p-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white transition-colors cursor-pointer"
                  title="Edit Provider Settings"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Delete Button (disabled for default Ollama) */}
                {!provider.isDefault && (
                  <button
                    type="button"
                    onClick={() => setProviderToDelete(provider)}
                    className="p-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-rose-950/40 border border-[var(--border-color,#282a36)] text-[var(--text-muted,#6b7280)] hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Provider"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT PROVIDER MODAL */}
      {/* ========================================================================= */}
      {(isAddModalOpen || editingProvider) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-[var(--border-color,#282a36)] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle,#1e2029)] pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[var(--accent-color,#818cf8)]" />
                <h3 className="font-bold text-sm text-[var(--text-primary,#e6e9f0)]">
                  {editingProvider ? `Edit ${editingProvider.name}` : "Add AI Provider"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProvider(null);
                }}
                className="p-1 rounded-lg text-[var(--text-muted,#6b7280)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider Type Picker (Only on Add) */}
            {!editingProvider && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary,#e6e9f0)]">
                  Provider Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "ollama", label: "Ollama" },
                    { id: "openai", label: "OpenAI-Comp." },
                    { id: "openrouter", label: "OpenRouter" },
                    { id: "custom", label: "Custom" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => resetForm(t.id as ProviderType)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                        formType === t.id
                          ? "bg-[var(--accent-color,#818cf8)]/15 border-[var(--accent-color,#818cf8)] text-[var(--accent-color,#818cf8)]"
                          : "bg-[var(--bg-primary,#131418)] border-[var(--border-color,#282a36)] text-[var(--text-secondary,#9ba3b2)] hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary,#e6e9f0)] mb-1">
                  Provider Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. My Local Ollama / OpenRouter Cloud"
                  className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] text-xs px-3.5 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary,#e6e9f0)] mb-1">
                  Base URL / Endpoint
                </label>
                <input
                  type="text"
                  value={formEndpoint}
                  onChange={(e) => setFormEndpoint(e.target.value)}
                  placeholder={
                    formType === "ollama"
                      ? "http://127.0.0.1:11434"
                      : formType === "openrouter"
                      ? "https://openrouter.ai/api/v1"
                      : "http://127.0.0.1:8000/v1"
                  }
                  className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3.5 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                />
                <p className="text-[10px] text-[var(--text-muted,#6b7280)] mt-1">
                  {formType === "ollama"
                    ? "Standard default: http://127.0.0.1:11434"
                    : "Base URL where /chat/completions and /models are served."}
                </p>
              </div>

              {/* API Key (Optional / required for cloud) */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary,#e6e9f0)] mb-1">
                  API Key {formType === "ollama" ? "(Optional)" : ""}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                    placeholder={formType === "openrouter" ? "sk-or-v1-..." : "Leave empty if no auth required"}
                    className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3.5 py-2 pr-10 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted,#6b7280)] hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Organization ID for OpenAI */}
              {formType === "openai" && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary,#e6e9f0)] mb-1">
                    Organization ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formOrgId}
                    onChange={(e) => setFormOrgId(e.target.value)}
                    placeholder="org-..."
                    className="w-full bg-[var(--input-bg,#16171e)] text-[var(--text-primary,#e6e9f0)] font-mono text-xs px-3.5 py-2 rounded-xl border border-[var(--input-border,#2a2d3c)] focus:outline-none focus:border-[var(--accent-color,#818cf8)]"
                  />
                </div>
              )}
            </div>

            {/* Test Connection Output */}
            {formTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  formTestResult.isConnected
                    ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                    : "bg-red-950/40 border-red-800 text-red-300"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {formTestResult.isConnected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span>{formTestResult.isConnected ? "Connection Successful!" : "Connection Failed"}</span>
                </div>
                {formTestResult.version && (
                  <p className="mt-1 text-[11px] opacity-80">{formTestResult.version}</p>
                )}
                {formTestResult.error && (
                  <p className="mt-1 text-[11px] opacity-90">{formTestResult.error}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle,#1e2029)]">
              <button
                type="button"
                onClick={handleTestModalForm}
                disabled={isTestingForm || !formEndpoint.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-semibold text-[var(--text-primary,#e6e9f0)] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingForm ? "animate-spin text-[var(--accent-color,#818cf8)]" : ""}`} />
                <span>Test Connection</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProvider(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-semibold text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={editingProvider ? handleSaveEditProvider : handleSaveAddProvider}
                  disabled={!formEndpoint.trim()}
                  className="px-4 py-1.5 rounded-xl bg-[var(--accent-color,#818cf8)] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {editingProvider ? "Save Changes" : "Add Provider"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE PROVIDER CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {providerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface,#1f212a)] border border-rose-800/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/50 border border-rose-800/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary,#e6e9f0)]">
                  Delete {providerToDelete.name}?
                </h3>
                <p className="text-[11px] text-[var(--text-muted,#6b7280)] font-mono mt-0.5">
                  {providerToDelete.endpoint}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary,#9ba3b2)] leading-relaxed">
              Are you sure you want to remove this provider configuration? Its models will no longer be listed in the model selector.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProviderToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[var(--btn-bg,#1c1e27)] hover:bg-[var(--btn-hover,#262834)] border border-[var(--border-color,#282a36)] text-xs font-semibold text-[var(--text-primary,#e6e9f0)] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Delete Provider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
