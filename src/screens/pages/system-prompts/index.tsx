import {
  Input,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
  Empty,
} from "@/components";
import { useSystemPrompts, useTranslation } from "@/hooks";
import {
  Search,
  MoreHorizontal,
  PlusIcon,
  Pencil,
  Trash2,
  CheckCircle2,
  WandSparklesIcon,
} from "lucide-react";
import { DeleteSystemPrompt } from "./Delete";
import { CreateEditDialog } from "./CreateEditDialog";
import { InvisibleAIPrompts } from "./InvisibleAIPrompts";
import { useState } from "react";
import { PageLayout } from "@/layouts";

const SystemPrompts = () => {
  const { t } = useTranslation();
  const {
    prompts,
    isLoading,
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
  }>({
    name: "",
    prompt: "",
  });

  const handleCreateClick = () => {
    setForm({ name: "", prompt: "" });
    setIsCreateEditDialogOpen(true);
  };

  const handleEditClick = (promptId: number) => {
    const promptToEdit = prompts.find((p) => p.id === promptId);
    if (promptToEdit) {
      setForm({
        id: promptToEdit.id,
        name: promptToEdit.name,
        prompt: promptToEdit.prompt,
      });
      setIsCreateEditDialogOpen(true);
    }
  };

  const handleDeleteClick = (promptId: number) => {
    const promptToDelete = prompts.find((p) => p.id === promptId);
    if (promptToDelete) {
      setForm({
        id: promptToDelete.id,
        name: promptToDelete.name,
        prompt: promptToDelete.prompt,
      });
      setIsDeleteDialogOpen(true);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      clearError();

      if (form.id) {

        await updatePrompt(form.id, {
          name: form.name,
          prompt: form.prompt,
        });
      } else {

        const newPrompt = await createPrompt({
          name: form.name,
          prompt: form.prompt,
        });

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

  const handleGenerate = (
    generatedPrompt: string,
    generatedPromptName: string
  ) => {
    setForm((prev) => ({
      ...prev,
      prompt: generatedPrompt,
      name: generatedPromptName,
    }));
  };

  const handleCardClick = (promptId: number) => {
    handleSelectPrompt(promptId);
  };

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(search.toLowerCase()) ||
      prompt.prompt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout
      title={t("prompts_title")}
      description={t("prompts_desc")}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-sm shadow-black/5">
        <div className="relative w-full select-none">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("prompts_search_placeholder")}
            className="h-11 rounded-lg border-transparent bg-muted pl-11 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="default"
          size="default"
          onClick={handleCreateClick}
          className="h-11 shrink-0 rounded-lg px-4"
        >
          <PlusIcon className="size-4" />
          {t("prompts_create_btn")}
        </Button>
      </div>
      {filteredPrompts.length === 0 ? (
        <Empty
          isLoading={isLoading}
          icon={WandSparklesIcon}
          title={t("prompts_none_title")}
          description={t("prompts_none_desc")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 pb-4 md:grid-cols-2">
          {[...filteredPrompts].reverse().map((prompt) => {
            const isSelected = selectedPromptId === prompt.id;
            return (
              <Card
                key={prompt.id}
                className={`group relative cursor-pointer gap-0 rounded-xl p-4 pb-12 shadow-sm shadow-black/5 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-transparent bg-card"
                }`}
                onClick={() => handleCardClick(prompt.id)}
              >
                {isSelected && (
                  <CheckCircle2 className="absolute right-4 top-4 size-5 shrink-0 text-green-500" />
                )}
                <CardHeader className="p-0 pb-0 select-none">
                  <div className="flex items-start justify-between gap-2 relative">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CardTitle className="line-clamp-1 flex-1 pr-6 text-base">
                          {prompt.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                        {prompt.prompt}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <span className="select-none text-xs text-muted-foreground">
                    {prompt.created_at}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex size-8 items-center justify-center rounded-lg transition-opacity hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <MoreHorizontal className="size-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(prompt.id);
                        }}
                      >
                        <Pencil className="size-4 mr-2" />
                        {t("prompts_edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(prompt.id);
                        }}
                      >
                        <Trash2 className="size-4 mr-2" />
                        {t("prompts_delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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

      <InvisibleAIPrompts />
    </PageLayout>
  );
};

export default SystemPrompts;
