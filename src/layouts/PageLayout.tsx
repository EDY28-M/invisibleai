import { Header, ScrollArea } from "@/components";

export const PageLayout = ({
  children,
  title,
  description,
  rightSlot,
  allowBackButton = false,
  isMainTitle = true,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  rightSlot?: React.ReactNode;
  allowBackButton?: boolean;
  isMainTitle?: boolean;
}) => {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1 pr-4">
        <div className="flex flex-col gap-6 px-1 pb-8 pt-4">
          <header>
            <Header
              isMainTitle={isMainTitle}
              showBorder={true}
              title={title}
              description={description}
              rightSlot={rightSlot}
              allowBackButton={allowBackButton}
            />
          </header>

          {children}
        </div>
      </ScrollArea>
    </div>
  );
};
