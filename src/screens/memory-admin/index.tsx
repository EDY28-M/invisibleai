import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "@/hooks";
import {
  Brain,
  BookOpen,
  Cpu,
  AlertTriangle,
  PlusIcon,
  Trash2,
  CheckCircle2,
  Search,
  X,
  FileText
} from "lucide-react";
import { PageLayout } from "@/layouts";
import { Button, Input } from "@/components";

interface UserMemoryItem {
  id: string;
  user_id: string;
  memory_type: string;
  content: string;
  importance: number;
}

interface AppKnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  importance: number;
}

interface AppFeatureItem {
  id: string;
  feature_name: string;
  description: string;
  status: string;
  route: string | null;
  frontend_component: string | null;
  backend_module: string | null;
}

interface AiFeedbackItem {
  id: string;
  conversation_id: string;
  issue_detected: string;
  bad_behavior: string;
  expected_behavior: string;
  severity: string;
  resolved: boolean;
}

const MemoryAdmin = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"user_memory" | "app_knowledge" | "app_features" | "ai_feedback">("user_memory");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // States for lists
  const [memories, setMemories] = useState<UserMemoryItem[]>([]);
  const [knowledge, setKnowledge] = useState<AppKnowledgeItem[]>([]);
  const [features, setFeatures] = useState<AppFeatureItem[]>([]);
  const [feedback, setFeedback] = useState<AiFeedbackItem[]>([]);

  // Dialog / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [userMemoryForm, setUserMemoryForm] = useState({ memory_type: "preference", content: "", importance: 3 });
  const [appKnowledgeForm, setAppKnowledgeForm] = useState({ title: "", content: "", category: "general", importance: 3 });
  const [appFeatureForm, setAppFeatureForm] = useState({ feature_name: "", description: "", status: "active", route: "", frontend_component: "", backend_module: "" });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "user_memory") {
        const data = await invoke<UserMemoryItem[]>("get_user_memories", { userId: "default_user" });
        setMemories(data);
      } else if (activeTab === "app_knowledge") {
        const data = await invoke<AppKnowledgeItem[]>("get_app_knowledge");
        setKnowledge(data);
      } else if (activeTab === "app_features") {
        const data = await invoke<AppFeatureItem[]>("get_app_features");
        setFeatures(data);
      } else if (activeTab === "ai_feedback") {
        const data = await invoke<AiFeedbackItem[]>("get_ai_feedback");
        setFeedback(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(typeof err === "string" ? err : err.message || t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalType("create");
    setEditingId(null);
    setUserMemoryForm({ memory_type: "preference", content: "", importance: 3 });
    setAppKnowledgeForm({ title: "", content: "", category: "general", importance: 3 });
    setAppFeatureForm({ feature_name: "", description: "", status: "active", route: "", frontend_component: "", backend_module: "" });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setModalType("edit");
    setEditingId(item.id);
    if (activeTab === "user_memory") {
      setUserMemoryForm({ memory_type: item.memory_type, content: item.content, importance: item.importance });
    } else if (activeTab === "app_knowledge") {
      setAppKnowledgeForm({ title: item.title, content: item.content, category: item.category, importance: item.importance });
    } else if (activeTab === "app_features") {
      setAppFeatureForm({
        feature_name: item.feature_name,
        description: item.description,
        status: item.status,
        route: item.route || "",
        frontend_component: item.frontend_component || "",
        backend_module: item.backend_module || ""
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("mem_delete_confirm"))) return;
    try {
      if (activeTab === "user_memory") {
        await invoke("delete_user_memory", { id });
      } else if (activeTab === "app_knowledge") {
        await invoke("delete_app_knowledge", { id });
      } else if (activeTab === "app_features") {
        await invoke("delete_app_feature", { id });
      }
      fetchData();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleResolveFeedback = async (id: string) => {
    try {
      await invoke("resolve_ai_feedback", { id });
      fetchData();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === "user_memory") {
        if (modalType === "create") {
          await invoke("create_user_memory", {
            userId: "default_user",
            memoryType: userMemoryForm.memory_type,
            content: userMemoryForm.content,
            importance: Number(userMemoryForm.importance)
          });
        } else {
          await invoke("update_user_memory", {
            id: editingId,
            content: userMemoryForm.content,
            importance: Number(userMemoryForm.importance)
          });
        }
      } else if (activeTab === "app_knowledge") {
        if (modalType === "create") {
          await invoke("create_app_knowledge", {
            title: appKnowledgeForm.title,
            content: appKnowledgeForm.content,
            category: appKnowledgeForm.category,
            importance: Number(appKnowledgeForm.importance)
          });
        } else {
          await invoke("update_app_knowledge", {
            id: editingId,
            title: appKnowledgeForm.title,
            content: appKnowledgeForm.content,
            category: appKnowledgeForm.category,
            importance: Number(appKnowledgeForm.importance)
          });
        }
      } else if (activeTab === "app_features") {
        if (modalType === "create") {
          await invoke("create_app_feature", {
            featureName: appFeatureForm.feature_name,
            description: appFeatureForm.description,
            status: appFeatureForm.status,
            route: appFeatureForm.route || null,
            frontendComponent: appFeatureForm.frontend_component || null,
            backendModule: appFeatureForm.backend_module || null
          });
        } else {
          await invoke("update_app_feature", {
            id: editingId,
            featureName: appFeatureForm.feature_name,
            description: appFeatureForm.description,
            status: appFeatureForm.status,
            route: appFeatureForm.route || null,
            frontendComponent: appFeatureForm.frontend_component || null,
            backendModule: appFeatureForm.backend_module || null
          });
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  return (
    <PageLayout title={t("mem_title")} description={t("mem_desc")}>
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto w-full p-2">
        
        {/* Left Tabs / Filters */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2 rounded-2xl border border-border/10 bg-card/20 dark:bg-card/60 backdrop-blur-xl p-4">
          <h4 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider mb-2 px-1">
            {t("mem_categories")}
          </h4>
          <button
            onClick={() => setActiveTab("user_memory")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "user_memory"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "text-muted-foreground hover:bg-card/40 hover:text-foreground border border-transparent"
            }`}
          >
            <Brain className="size-4 shrink-0" />
            <span>{t("mem_tab_user")}</span>
          </button>

          <button
            onClick={() => setActiveTab("app_knowledge")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "app_knowledge"
                ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                : "text-muted-foreground hover:bg-card/40 hover:text-foreground border border-transparent"
            }`}
          >
            <BookOpen className="size-4 shrink-0" />
            <span>{t("mem_tab_knowledge")}</span>
          </button>

          <button
            onClick={() => setActiveTab("app_features")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "app_features"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "text-muted-foreground hover:bg-card/40 hover:text-foreground border border-transparent"
            }`}
          >
            <Cpu className="size-4 shrink-0" />
            <span>{t("mem_tab_features")}</span>
          </button>

          <button
            onClick={() => setActiveTab("ai_feedback")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "ai_feedback"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "text-muted-foreground hover:bg-card/40 hover:text-foreground border border-transparent"
            }`}
          >
            <AlertTriangle className="size-4 shrink-0" />
            <span>{t("mem_tab_feedback")}</span>
          </button>
        </div>

        {/* Center Panel */}
        <div className="flex-1 flex flex-col gap-4 rounded-2xl border border-border/10 bg-card/20 dark:bg-card/60 backdrop-blur-xl p-5 overflow-hidden">
          
          {/* Header controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-border/10">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
              <Input
                placeholder={t("mem_filter")}
                className="pl-9 h-9 text-xs rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {activeTab !== "ai_feedback" && (
              <Button
                onClick={handleOpenCreateModal}
                className="w-full sm:w-auto h-9 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
              >
                <PlusIcon className="size-3.5" />
                {t("mem_add")}
              </Button>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex justify-between items-center text-xs text-destructive">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="hover:opacity-70"><X className="size-4" /></button>
            </div>
          )}

          {/* List display */}
          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3">
            {loading ? (
              <div className="text-center py-12 text-xs text-muted-foreground">{t("mem_loading")}</div>
            ) : (
              <>
                {/* 1. USER MEMORY TAB */}
                {activeTab === "user_memory" && memories
                  .filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => (
                    <div key={item.id} className="group relative rounded-xl border border-border/15 bg-card/25 dark:bg-white/5 p-3.5 flex justify-between items-start hover:bg-card/45 dark:hover:bg-white/8 transition-all">
                      <div className="space-y-1 pr-12">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-wider font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded">
                            {item.memory_type}
                          </span>
                          <span className="text-[9px] font-semibold text-muted-foreground/60">
                            {t("mem_priority")} {item.importance}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed font-mono">{item.content}</p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEditModal(item)} className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground/75"><FileText className="size-3.5" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="size-3.5" /></button>
                      </div>
                    </div>
                  ))}

                {/* 2. APP KNOWLEDGE TAB */}
                {activeTab === "app_knowledge" && knowledge
                  .filter(k => k.title.toLowerCase().includes(searchQuery.toLowerCase()) || k.content.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => (
                    <div key={item.id} className="group relative rounded-xl border border-border/15 bg-card/25 dark:bg-white/5 p-3.5 flex justify-between items-start hover:bg-card/45 dark:hover:bg-white/8 transition-all">
                      <div className="space-y-1.5 pr-12">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-foreground/90">{item.title}</h5>
                          <span className="text-[8px] uppercase tracking-wider font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20 px-1 py-0.2 rounded">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.content}</p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEditModal(item)} className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground/75"><FileText className="size-3.5" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="size-3.5" /></button>
                      </div>
                    </div>
                  ))}

                {/* 3. APP FEATURES TAB */}
                {activeTab === "app_features" && features
                  .filter(f => f.feature_name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => (
                    <div key={item.id} className="group relative rounded-xl border border-border/15 bg-card/25 dark:bg-white/5 p-3.5 flex justify-between items-start hover:bg-card/45 dark:hover:bg-white/8 transition-all">
                      <div className="space-y-1.5 pr-12">
                        <div className="flex items-center gap-2.5">
                          <h5 className="text-xs font-bold text-foreground/90">{item.feature_name}</h5>
                          <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded border ${
                            item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{item.description}</p>
                        {item.route && (
                          <div className="text-[9px] font-mono text-muted-foreground/50">
                            {t("mem_route_info")} {item.route} {item.frontend_component && `| Comp: ${item.frontend_component}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEditModal(item)} className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground/75"><FileText className="size-3.5" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="size-3.5" /></button>
                      </div>
                    </div>
                  ))}

                {/* 4. AI FEEDBACK TAB */}
                {activeTab === "ai_feedback" && feedback
                  .filter(f => f.issue_detected.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => (
                    <div key={item.id} className="group relative rounded-xl border border-border/15 bg-card/25 dark:bg-white/5 p-4 space-y-2 hover:bg-card/45 dark:hover:bg-white/8 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] uppercase tracking-wider font-bold border px-1.5 py-0.2 rounded ${
                            item.severity === "high"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : item.severity === "medium"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}>
                            {t("mem_severity")} {item.severity}
                          </span>
                          <span className={`text-[8px] uppercase tracking-wider font-bold border px-1.5 py-0.2 rounded ${
                            item.resolved
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}>
                            {item.resolved ? t("mem_resolved") : t("mem_pending")}
                          </span>
                        </div>
                        {!item.resolved && (
                          <button
                            onClick={() => handleResolveFeedback(item.id)}
                            className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 hover:underline"
                          >
                            <CheckCircle2 className="size-3.5" />
                            {t("mem_mark_resolved")}
                          </button>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-foreground/90"><span className="text-muted-foreground/60 mr-1.5">{t("mem_problem")}</span>{item.issue_detected}</p>
                        <p className="text-muted-foreground/80 leading-relaxed font-mono"><span className="text-rose-400/80 mr-1.5">{t("mem_bad_behavior")}</span>{item.bad_behavior}</p>
                        <p className="text-emerald-400/80 leading-relaxed font-mono"><span className="text-emerald-400/60 mr-1.5">{t("mem_expected_behavior")}</span>{item.expected_behavior}</p>
                      </div>
                    </div>
                  ))}

                {!loading && (
                  (activeTab === "user_memory" && memories.length === 0) ||
                  (activeTab === "app_knowledge" && knowledge.length === 0) ||
                  (activeTab === "app_features" && features.length === 0) ||
                  (activeTab === "ai_feedback" && feedback.length === 0)
                ) && (
                  <div className="text-center py-16 text-xs text-muted-foreground">{t("mem_empty")}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border/10 bg-card p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-border/10">
              <h3 className="text-sm font-bold text-foreground/90">
                {modalType === "create" ? t("mem_modal_add") : t("mem_modal_edit")} ({activeTab === "user_memory" ? t("mem_tab_user") : activeTab === "app_knowledge" ? t("mem_tab_knowledge") : t("mem_tab_features")})
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:opacity-75"><X className="size-4" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* Form fields: USER_MEMORY */}
              {activeTab === "user_memory" && (
                <>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_memory_type")}</label>
                    <select
                      className="w-full h-9 rounded-xl border border-border/20 bg-card/40 px-3 text-xs text-foreground"
                      value={userMemoryForm.memory_type}
                      onChange={(e) => setUserMemoryForm(prev => ({ ...prev, memory_type: e.target.value }))}
                    >
                      <option value="preference">{t("mem_type_preference")}</option>
                      <option value="technical">{t("mem_type_technical")}</option>
                      <option value="general">{t("mem_type_general")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_memory_content")}</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-border/20 bg-card/40 p-3 text-xs text-foreground"
                      placeholder="Ej: El usuario prefiere respuestas concisas en markdown sin saludos..."
                      value={userMemoryForm.content}
                      onChange={(e) => setUserMemoryForm(prev => ({ ...prev, content: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_importance")}</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="w-full h-9 rounded-xl border border-border/20 bg-card/40 px-3 text-xs text-foreground"
                      value={userMemoryForm.importance}
                      onChange={(e) => setUserMemoryForm(prev => ({ ...prev, importance: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </>
              )}

              {/* Form fields: APP_KNOWLEDGE */}
              {activeTab === "app_knowledge" && (
                <>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_knowledge_title")}</label>
                    <Input
                      className="h-9 rounded-xl text-xs"
                      placeholder="Ej: ¿Qué es InvisibleAI?"
                      value={appKnowledgeForm.title}
                      onChange={(e) => setAppKnowledgeForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_knowledge_category")}</label>
                    <select
                      className="w-full h-9 rounded-xl border border-border/20 bg-card/40 px-3 text-xs text-foreground"
                      value={appKnowledgeForm.category}
                      onChange={(e) => setAppKnowledgeForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="general">{t("mem_category_general")}</option>
                      <option value="architecture">{t("mem_category_architecture")}</option>
                      <option value="config">{t("mem_category_config")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_knowledge_content")}</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-border/20 bg-card/40 p-3 text-xs text-foreground"
                      placeholder="Describe los detalles de la característica para que el LLM lo entienda..."
                      value={appKnowledgeForm.content}
                      onChange={(e) => setAppKnowledgeForm(prev => ({ ...prev, content: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_importance")}</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="w-full h-9 rounded-xl border border-border/20 bg-card/40 px-3 text-xs text-foreground"
                      value={appKnowledgeForm.importance}
                      onChange={(e) => setAppKnowledgeForm(prev => ({ ...prev, importance: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </>
              )}

              {/* Form fields: APP_FEATURES */}
              {activeTab === "app_features" && (
                <>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_feature_name")}</label>
                    <Input
                      className="h-9 rounded-xl text-xs"
                      placeholder="Ej: Análisis de conversaciones"
                      value={appFeatureForm.feature_name}
                      onChange={(e) => setAppFeatureForm(prev => ({ ...prev, feature_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_feature_desc")}</label>
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border border-border/20 bg-card/40 p-3 text-xs text-foreground"
                      placeholder="Describe qué hace y para qué sirve..."
                      value={appFeatureForm.description}
                      onChange={(e) => setAppFeatureForm(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_feature_status")}</label>
                    <select
                      className="w-full h-9 rounded-xl border border-border/20 bg-card/40 px-3 text-xs text-foreground"
                      value={appFeatureForm.status}
                      onChange={(e) => setAppFeatureForm(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="active">{t("active")}</option>
                      <option value="inactive">{t("inactive")}</option>
                      <option value="in_development">{t("mem_status_in_dev")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_feature_route")}</label>
                    <Input
                      className="h-9 rounded-xl text-xs"
                      placeholder="Ej: /conversation-analysis"
                      value={appFeatureForm.route}
                      onChange={(e) => setAppFeatureForm(prev => ({ ...prev, route: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 flex gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_feature_component")}</label>
                      <Input
                        className="h-9 rounded-xl text-xs"
                        placeholder="Ej: AnalysisPage.tsx"
                        value={appFeatureForm.frontend_component}
                        onChange={(e) => setAppFeatureForm(prev => ({ ...prev, frontend_component: e.target.value }))}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-muted-foreground/75 font-semibold">{t("mem_modal_feature_rust")}</label>
                      <Input
                        className="h-9 rounded-xl text-xs"
                        placeholder="Ej: analysis.rs"
                        value={appFeatureForm.backend_module}
                        onChange={(e) => setAppFeatureForm(prev => ({ ...prev, backend_module: e.target.value }))}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border/10">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} className="h-9 rounded-xl text-xs px-4">
                  {t("cancel")}
                </Button>
                <Button type="submit" className="h-9 rounded-xl text-xs px-4 font-semibold">
                  {t("save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default MemoryAdmin;
