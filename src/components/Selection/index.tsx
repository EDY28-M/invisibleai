import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";
import { useTranslation } from "@/hooks";
import { Loader2 } from "lucide-react";

export const Selection = ({
  selected,
  onChange,
  options,
  placeholder,
  isLoading = false,
  disabled = false,
}: {
  selected?: string;
  onChange: (value: any) => void;
  options: { label: string; value: string }[] | [];
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <Select value={selected || ""} onValueChange={(value) => onChange(value)}>
      <SelectTrigger
        disabled={isLoading || disabled}
        className="shadow-none w-full h-11 border-1 border-input/50 focus:border-primary/50 transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            {t("loading")} <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <SelectValue
            placeholder={placeholder}
            className="flex items-center gap-2"
          ></SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {options?.map((provider) => (
          <SelectItem
            key={provider.value}
            value={provider.value}
            className="cursor-pointer hover:bg-accent/50"
          >
            <span className="font-medium">{provider.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
