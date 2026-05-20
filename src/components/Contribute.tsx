import { Card, CardContent, CardDescription, CardTitle } from "./ui";
import { useTranslation } from "@/hooks";

const Contribute = () => {
  const { t } = useTranslation();

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="space-y-2">
          <CardTitle className="text-xs lg:text-sm">
            {t("dev_contribute_title")}
          </CardTitle>
          <CardDescription className="text-[10px] lg:text-xs">
            {t("dev_contribute_desc")}
          </CardDescription>
        </div>
      </CardContent>
    </Card>
  );
};

export default Contribute;
