import {
  Input,
  Button,
} from "@/components";
import { useSystemPrompts, useTranslation } from "@/hooks";
import {
  Search,
  MoreHorizontal,
  PlusIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { DeleteSystemPrompt } from "./Delete";
import { CreateEditDialog } from "./CreateEditDialog";
import { InvisibleAIPrompts } from "./InvisibleAIPrompts";
import { useState } from "react";
import { PageLayout } from "@/layouts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components";

const SystemPrompts = () => {
  const { t } = useTranslation();
  const {
    prompts,
    error,
    createPrompt,
    deletePrompt,
    updatePrompt,
    selectedPromptId,
    handleSelectPrompt,
    clearError,
  } = useSystemPrompts();

  const [search, setSearch] = useState("");
  const [isCreateEditDialogOpen, setIsCreateEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<{
    id?: number;
    name: string;
    prompt: string;
  }>({ name: "", prompt: "" });

  const handleCreateClick = () => {
    setForm({ name: "", prompt: "" });
    setIsCreateEditDialogOpen(true);
  };

  const handleEditClick = (promptId: number) => {
    const promptToEdit = prompts.find((p) => p.id === promptId);
    if (promptToEdit) {
      setForm({ id: promptToEdit.id, name: promptToEdit.name, prompt: promptToEdit.prompt });
      setIsCreateEditDialogOpen(true);
    }
  };

  const handleDeleteClick = (promptId: number) => {
    const promptToDelete = prompts.find((p) => p.id === promptId);
    if (promptToDelete) {
      setForm({ id: promptToDelete.id, name: promptToDelete.name, prompt: promptToDelete.prompt });
      setIsDeleteDialogOpen(true);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      clearError();
      if (form.id) {
        await updatePrompt(form.id, { name: form.name, prompt: form.prompt });
      } else {
        const newPrompt = await createPrompt({ name: form.name, prompt: form.prompt });
        handleSelectPrompt(newPrompt.id);
      }
      setForm({ name: "", prompt: "" });
      setIsCreateEditDialogOpen(false);
    } catch (err) {
      console.error("Failed to save prompt:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async (id: number) => {
    await deletePrompt(id);
    setForm({ name: "", prompt: "" });
    setIsDeleteDialogOpen(false);
  };

  const handleGenerate = (generatedPrompt: string, generatedPromptName: string) => {
    setForm((prev) => ({ ...prev, prompt: generatedPrompt, name: generatedPromptName }));
  };

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(search.toLowerCase()) ||
      prompt.prompt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout title={t("prompts_title")} description={t("prompts_desc")}>
      {error && (
        <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start w-full max-w-5xl mx-auto p-1">

        {/* Left — Preset Prompts Catalog */}
        <div className="relative lg:col-span-2 rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-violet-500/8 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <InvisibleAIPrompts />
          </div>
        </div>

        {/* Right — Custom Prompts Panel */}
        <div className="relative lg:col-span-1 rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-5 overflow-hidden space-y-4">
          <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/10">
              <h3 className="text-[15px] font-bold text-foreground/90 tracking-wide">
                {t("prompts_title")}
              </h3>
              <span className="text-xs font-bold bg-foreground/6 border border-border/15 px-2 py-0.5 rounded-full text-muted-foreground/60">
                {filteredPrompts.length}
              </span>
            </div>

            {/* Search + Create */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
                <Input
                  type="text"
                  placeholder={t("prompts_search_placeholder")}
                  className="h-10 rounded-xl border border-border/20 bg-card/20 pl-10 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateClick}
                className="h-10 shrink-0 rounded-xl px-4 text-sm font-semibold flex items-center gap-2"
              >
                <PlusIcon className="size-4" />
                {t("prompts_create_btn").split(" ")[0]}
              </Button>
            </div>

            {/* Prompts list or empty state */}
            {filteredPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 animate-in fade-in duration-200">
                <p className="text-base font-semibold text-foreground/60">{t("prompts_none_title")}</p>
                <p className="text-xs text-muted-foreground/50 max-w-[220px] leading-relaxed">{t("prompts_none_desc")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateClick}
                  className="h-9 rounded-xl text-xs px-4 font-semibold border-border/20 hover:bg-card/40 transition-all"
                >
                  {t("prompts_create_btn")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
                {[...filteredPrompts].reverse().map((prompt) => {
                  const isSelected = selectedPromptId === prompt.id;
                  return (
                    <div
                      key={prompt.id}
                      onClick={() => handleSelectPrompt(prompt.id)}
                      className={`relative group cursor-pointer rounded-2xl border p-3.5 pb-9 transition-all duration-200 overflow-hidden ${
                        isSelected
                          ? "border-border/30 bg-card/60 shadow-sm"
                          : "border-border/15 bg-card/20 hover:bg-card/40 hover:border-border/25"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
                      )}
                      <div className="relative z-10 space-y-1">
                        <p className="text-[15px] font-semibold text-foreground/90 pr-6 line-clamp-1">
                          {prompt.name}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground/60 line-clamp-2">
                          {prompt.prompt}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" />
                      )}

                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pt-1.5 border-t border-border/8">
                        <span className="text-[11px] text-muted-foreground/40">{prompt.created_at}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="flex size-5 items-center justify-center rounded-md hover:bg-muted/60 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-3.5 text-muted-foreground/50" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 rounded-xl">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(prompt.id); }} className="rounded-lg">
                              <Pencil className="size-3.5 mr-2 text-muted-foreground" />
                              <span className="text-xs">{t("prompts_edit")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick(prompt.id); }} className="rounded-lg">
                              <Trash2 className="size-3.5 mr-2" />
                              <span className="text-xs">{t("prompts_delete")}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateEditDialog
        isOpen={isCreateEditDialogOpen}
        onOpenChange={setIsCreateEditDialogOpen}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        onGenerate={handleGenerate}
        isEditing={!!form.id}
        isSaving={isSaving}
      />

      <DeleteSystemPrompt
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        promptId={form.id}
        promptName={form.name}
        onDelete={handleDeleteConfirm}
      />
    </PageLayout>
  );
};

export default SystemPrompts;
