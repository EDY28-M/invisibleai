import { useCallback, useState } from "react";
import { X } from "lucide-react";

import { safeLocalStorage } from "@/lib/storage";

import { Button, Card, CardContent, CardDescription, CardTitle } from "./ui";
import { useApp } from "@/contexts";

const STORAGE_KEY = "invisibleai-promote-card-dismissed";

const Promote = () => {
  const { hasActiveLicense } = useApp();

  // Los hooks SIEMPRE deben llamarse en el mismo orden, antes de cualquier
  // `return` condicional. Tenerlos tras `if (hasActiveLicense) return null`
  // hacía que React lanzara "rendered fewer hooks than expected" al activar
  // la licencia (hasActiveLicense pasa de false→true) y podía tumbar la vista.
  const [isDismissed, setIsDismissed] = useState(
    () => safeLocalStorage.getItem(STORAGE_KEY) === "true"
  );

  const handleDismiss = useCallback(() => {
    safeLocalStorage.setItem(STORAGE_KEY, "true");
    setIsDismissed(true);
  }, []);

  if (hasActiveLicense) return null;
  if (isDismissed) return null;

  return (
    <Card className="relative w-full">
      <CardContent className="flex flex-col gap-4 p-4 py-0 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2 md:max-w-[70%]">
          <CardTitle className="text-xs lg:text-sm">
            Promote InvisibleAI, Earn Rewards
          </CardTitle>
          <CardDescription className="text-[10px] lg:text-xs">
            Share InvisibleAI on social, hit 5K impressions, and we&apos;ll send you
            a $5&ndash;$10 coupon for a monthly plan. Email your post link to{" "}
            <a
              className="text-primary underline underline-offset-4"
              href="mailto:support@invisibleai.com"
            >
              support@invisibleai.com
            </a>
            .
          </CardDescription>
        </div>
        <Button asChild className="w-full md:w-auto text-[10px] lg:text-xs">
          <a
            href="https://invisibleai.com/promote"
            rel="noopener noreferrer"
            target="_blank"
          >
            InvisibleAI.com/promote
          </a>
        </Button>
      </CardContent>
      <button
        aria-label="Dismiss promotion"
        className="absolute -right-1 -top-2 rounded-full border border-transparent bg-primary/10 p-1 transition hover:border-primary/20 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={handleDismiss}
        type="button"
      >
        <X className="size-3 lg:size-4 text-primary" />
      </button>
    </Card>
  );
};

export default Promote;
