import { Input, Card, Empty } from "@/components";
import { useHistory, useTranslation } from "@/hooks";
import { PageLayout } from "@/layouts";
import { MessageCircleIcon, Search } from "lucide-react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Dashboard = () => {
  const { t, language } = useTranslation();
  const conversations = useHistory();
  const navigate = useNavigate();

  useEffect(() => {
    if (language === "spanish") {
      moment.locale("es");
    } else {
      moment.locale("en");
    }
  }, [language]);

  const groupedConversations = conversations.conversations.reduce(
    (acc, doc) => {
      const dateKey = moment(doc.updatedAt).format("YYYY-MM-DD");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(doc);
      return acc;
    },
    {} as Record<string, typeof conversations.conversations>
  );

  const sortedDates = Object.keys(groupedConversations).sort((a, b) =>
    moment(b).diff(moment(a))
  );

  return (
    <PageLayout
      title={t("chats_title")}
      description={t("chats_desc")}
    >
      <>
        {conversations.conversations.length === 0 ? (
          <Empty
            isLoading={conversations.isLoading}
            icon={MessageCircleIcon}
            title={t("chats_none_title")}
            description={t("chats_none_desc")}
          />
        ) : (
          <div className="flex flex-col gap-4 pb-8">
            <div className="rounded-xl bg-card p-4 shadow-sm shadow-black/5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("chats_search_placeholder")}
                  className="h-11 rounded-lg border-transparent bg-muted pl-11 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={conversations.search}
                  onChange={(e) => conversations.setSearch(e.target.value)}
                />
              </div>
            </div>

            {sortedDates
              .filter((dateKey) =>
                conversations?.search?.length === 0
                  ? true
                  : groupedConversations?.[dateKey]?.some((doc) =>
                      doc?.title
                        .toLowerCase()
                        .includes(conversations?.search?.toLowerCase() || "")
                    )
              )
              .map((dateKey) => (
                <section
                  key={dateKey}
                  className="rounded-xl bg-card p-4 shadow-sm shadow-black/5"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-border/70 pb-3">
                    <p className="select-none text-xs font-semibold uppercase tracking-wide text-primary">
                      {moment(dateKey).format("ddd, MMM D")}
                    </p>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {groupedConversations[dateKey].length}
                    </span>
                  </div>
                  <div>
                    {groupedConversations[dateKey].map((doc) => (
                      <Card
                        key={doc.id}
                        className="group relative cursor-pointer select-none gap-0 rounded-lg border-0 bg-transparent p-3 shadow-none transition-colors hover:bg-muted/70"
                        onClick={() => navigate(`/chats/view/${doc.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-9 w-1 shrink-0 rounded-full bg-border transition-colors group-hover:bg-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-medium">
                              {doc.title}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {doc.messages.length}{" "}
                                {t("chats_messages_count")}
                              </span>
                              <span>{moment(doc.updatedAt).format("hh:mm A")}</span>
                            </div>
                          </div>
                          <span className="hidden text-xs text-muted-foreground sm:block">
                            {moment(doc.updatedAt).fromNow()}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </>
    </PageLayout>
  );
};

export default Dashboard;
