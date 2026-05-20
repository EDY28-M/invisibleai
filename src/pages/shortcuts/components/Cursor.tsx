import {
  Header,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";
import { useApp } from "@/contexts";
import { getPlatform } from "@/lib";
import { CursorType } from "@/lib/storage";
import { MousePointer, MousePointer2, Pointer, TextCursor } from "lucide-react";
import { useTranslation } from "@/hooks";

interface CursorSelectionProps {
  className?: string;
}

export const CursorSelection = ({ className }: CursorSelectionProps) => {
  const { customizable, setCursorType } = useApp();
  const platform = getPlatform();
  const { t } = useTranslation();

  return (
    <div id="cursor" className={`space-y-2 ${className}`}>
      <Header
        title={t("shortcuts_cursor_title")}
        description={t("shortcuts_cursor_desc")}
        rightSlot={
          <Select
            value={customizable.cursor.type}
            onValueChange={(value) => setCursorType(value as CursorType)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("shortcuts_cursor_placeholder")} />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectItem value="invisible" disabled={platform === "linux"}>
                {t("shortcuts_cursor_invisible")} (<MousePointer2 className="size-3 px-0" />){" "}
                {platform === "linux" && (
                  <span className="text-xs text-muted-foreground">
                    {t("shortcuts_cursor_linux_not_supported")}
                  </span>
                )}
              </SelectItem>
              <SelectItem value="default">
                {t("shortcuts_cursor_default")} (<MousePointer className="size-3" />)
              </SelectItem>
              <SelectItem value="auto">
                {t("shortcuts_cursor_auto")} (
                <MousePointer className="size-3" />/
                <TextCursor className="size-3" /> /
                <Pointer className="size-3" />)
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
};
