import { useState, useEffect } from "react";
import { useProfiles, useTranslation } from "@/hooks";
import { PageLayout } from "@/layouts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Textarea,
} from "@/components";
import * as Lucide from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to resolve Lucide icons from SQLite string tags
const getIconComponent = (iconName: string) => {
  switch (iconName) {
    // Templates
    case "server": return Lucide.ServerIcon;
    case "layout": return Lucide.LayoutGridIcon;
    case "layers": return Lucide.LayersIcon;
    case "database": return Lucide.DatabaseIcon;
    case "bar-chart": return Lucide.BarChart3Icon;
    case "trending-up": return Lucide.TrendingUpIcon;
    case "palette": return Lucide.PaletteIcon;
    case "graduation-cap": return Lucide.GraduationCapIcon;
    case "microscope": return Lucide.MicroscopeIcon;
    case "terminal": return Lucide.TerminalIcon;
    case "brain": return Lucide.BrainIcon;
    // Modifiers
    case "code": return Lucide.Code2Icon;
    case "component": return Lucide.CpuIcon;
    case "cloud": return Lucide.CloudIcon;
    case "users": return Lucide.UsersIcon;
    case "check-circle": return Lucide.CheckCircle2Icon;
    case "boxes": return Lucide.BoxesIcon;
    case "book-open": return Lucide.BookOpenIcon;
    case "calculator": return Lucide.CalculatorIcon;
    case "message-circle": return Lucide.MessageSquareIcon;
    case "git-merge": return Lucide.GitMergeIcon;
    case "pen-tool": return Lucide.PenToolIcon;
    case "git-branch": return Lucide.GitBranchIcon;
    default: return Lucide.HelpCircleIcon;
  }
};

export default function ProfilesPage() {
  const { t } = useTranslation();
  const {
    templates,
    modifiers,
    activeConfig,
    isLoading,
    error,
    selectTemplate,
    toggleModifier,
    setCustomNotes,
  } = useProfiles();

  const [notesText, setNotesText] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Sync notes text when activeConfig is loaded
  useEffect(() => {
    if (activeConfig) {
      setNotesText(activeConfig.custom_notes || "");
    }
  }, [activeConfig]);

  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true);
      await setCustomNotes(notesText);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeactivate = async () => {
    await selectTemplate(""); // Empty string deactivates
  };

  // Group modifiers by category
  const groupedModifiers = modifiers.reduce((acc, curr) => {
    if (!acc[curr.category]) {
      acc[curr.category] = [];
    }
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, typeof modifiers>);

  const activeTemplate = templates.find((t) => t.id === activeConfig?.template_id);

  // Translate categories
  const getCategoryLabel = (category: string) => {
    switch (category.toLowerCase()) {
      case "engineering":
        return t("profiles_category_eng");
      case "data":
        return t("profiles_category_data");
      case "business":
        return t("profiles_category_biz");
      case "design":
        return t("profiles_category_design");
      case "academic":
        return t("profiles_category_acad");
      case "general":
        return t("profiles_category_gen");
      default:
        return category;
    }
  };

  return (
    <PageLayout
      title={t("profiles_title")}
      description={t("profiles_desc")}
      rightSlot={
        activeConfig?.template_id && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeactivate}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive transition-all duration-200"
          >
            <Lucide.PowerOffIcon className="mr-2 size-4" />
            {t("profiles_clear_profile")}
          </Button>
        )
      }
    >
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <Lucide.AlertCircleIcon className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. SECCIÓN: CONFIGURACIÓN ACTIVA */}
      <Card className="border border-border/40 bg-card/40 backdrop-blur-md shadow-md transition-all duration-300">
        <CardHeader className="border-b border-border/20 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lucide.CpuIcon className="size-5 text-primary" />
              {t("profiles_active_title")}
            </CardTitle>
            {activeConfig?.template_id ? (
              <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 font-semibold px-2.5 py-0.5 animate-pulse">
                {t("active")}
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-semibold px-2.5 py-0.5">
                {t("inactive")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col md:flex-row items-start md:items-center gap-6">
          {activeTemplate ? (
            <>
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-sm shadow-primary/10">
                {(() => {
                  const Icon = getIconComponent(activeTemplate.icon);
                  return <Icon className="size-7" />;
                })()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">
                    {activeTemplate.name}
                  </h3>
                  <Badge variant="outline" className="text-xs py-0.5">
                    {getCategoryLabel(activeTemplate.category)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {activeTemplate.base_role}
                </p>
                {activeConfig && activeConfig.selected_modifiers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {activeConfig.selected_modifiers.map((modId) => {
                      // Note that modifiers list has only items for the *currently active* template,
                      // but we want to render it here.
                      const mod = modifiers.find((m) => m.id === modId);
                      if (!mod) return null;
                      const ModIcon = getIconComponent(mod.icon);
                      return (
                        <Badge
                          key={modId}
                          variant="secondary"
                          className="bg-primary/5 text-primary hover:bg-primary/10 border border-primary/15 flex items-center gap-1 text-xs py-0.5 px-2"
                        >
                          <ModIcon className="size-3" />
                          {mod.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-start gap-4 py-2 w-full">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-muted bg-muted/40 text-muted-foreground/70">
                <Lucide.ShieldAlertIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-foreground">
                  {t("profiles_active_fallback")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("profiles_active_fallback_desc")}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. SECCIÓN: GRILLA DE PLANTILLAS */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Lucide.SparklesIcon className="size-5 text-primary" />
          {t("profiles_templates_title")}
        </h2>

        {isLoading && templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Lucide.Loader2Icon className="size-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => {
              const isActive = activeConfig?.template_id === tpl.id;
              const TplIcon = getIconComponent(tpl.icon);

              return (
                <Card
                  key={tpl.id}
                  onClick={() => {
                    if (isActive) {
                      selectTemplate("");
                    } else {
                      selectTemplate(tpl.id);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border bg-card/30 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between overflow-hidden",
                    isActive
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md shadow-primary/5"
                      : "border-border/40 hover:border-border-hover"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "flex size-10 items-center justify-center rounded-xl border transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/55 bg-background/50 text-muted-foreground"
                      )}>
                        <TplIcon className="size-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">
                        {getCategoryLabel(tpl.category)}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold mt-3 text-foreground">
                      {tpl.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs mt-1 text-muted-foreground">
                      {tpl.base_role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0 text-[11px] text-muted-foreground/80 leading-relaxed border-t border-border/10 mt-3 pt-3">
                    <span className="font-semibold block text-foreground/90 mb-1">
                      Personalidad:
                    </span>
                    <p className="line-clamp-2">{tpl.base_personality}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SECCIÓN: MODIFICADORES & NOTAS (Visible solo si hay perfil activo) */}
      {activeConfig?.template_id && activeTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          {/* Modificadores */}
          <Card className="border border-border/40 bg-card/40 backdrop-blur-md shadow-sm lg:col-span-7 flex flex-col justify-between h-full">
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lucide.SlidersIcon className="size-5 text-primary" />
                {t("profiles_modifiers_title")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("profiles_modifiers_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {modifiers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                  <Lucide.Layers3Icon className="size-8 mb-2 opacity-40" />
                  <p className="text-xs">No hay modificadores disponibles para este perfil.</p>
                </div>
              ) : (
                Object.keys(groupedModifiers).map((catName) => (
                  <div key={catName} className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                      {catName}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {groupedModifiers[catName].map((mod) => {
                        const isSelected = activeConfig.selected_modifiers.includes(mod.id);
                        const ModIcon = getIconComponent(mod.icon);

                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => toggleModifier(mod.id)}
                            title={mod.extra_instructions}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20 scale-[1.02]"
                                : "bg-background/40 hover:bg-background/80 text-foreground border-border/50 hover:border-border"
                            )}
                          >
                            <ModIcon className="size-3.5 shrink-0" />
                            <span>{mod.name}</span>
                            {isSelected && (
                              <Lucide.CheckIcon className="size-3 shrink-0 ml-0.5 animate-scale-up" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Notas de Sesión */}
          <Card className="border border-border/40 bg-card/40 backdrop-blur-md shadow-sm lg:col-span-5 flex flex-col justify-between h-full">
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lucide.StickyNoteIcon className="size-5 text-primary" />
                {t("profiles_notes_title")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("profiles_notes_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <Textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder={t("profiles_notes_placeholder")}
                className="min-h-[160px] bg-background/50 border-border/40 focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none text-sm leading-relaxed"
              />
            </CardContent>
            <CardFooter className="border-t border-border/20 pt-4 flex items-center justify-between gap-4">
              {showSavedFeedback ? (
                <span className="text-xs font-medium text-emerald-500 flex items-center gap-1 animate-fade-in">
                  <Lucide.CheckCircle2Icon className="size-4" />
                  {t("profiles_notes_saved")}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/60">
                  Cambios locales
                </span>
              )}
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm px-4"
              >
                {isSavingNotes ? (
                  <>
                    <Lucide.Loader2Icon className="mr-2 size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Lucide.SaveIcon className="mr-2 size-4" />
                    {t("profiles_save_notes")}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
