import { Input, Empty } from "@/components";
import { useHistory, useTranslation } from "@/hooks";
import { PageLayout } from "@/layouts";
import { MessageCircleIcon, Search } from "lucide-react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const ChatsHistory = () => {
  const { t, language } = useTranslation();
  const conversations = useHistory();
  const navigate = useNavigate();

  useEffect(() => {
    moment.locale(language === "spanish" ? "es" : "en");
  }, [language]);

  const groupedConversations = conversations.conversations.reduce(
    (acc, doc) => {
      const dateKey = moment(doc.updatedAt).format("YYYY-MM-DD");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(doc);
      return acc;
    },
    {} as Record<string, typeof conversations.conversations>
  );

  const sortedDates = Object.keys(groupedConversations).sort((a, b) =>
    moment(b).diff(moment(a))
  );

  return (
    <PageLayout title={t("chats_title")} description={t("chats_desc")}>
      {conversations.conversations.length === 0 ? (
        /* Empty state — centered with subtle orb behind */
        <div className="relative flex flex-col items-center justify-center min-h-[320px] rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-violet-500/6 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <Empty
              isLoading={conversations.isLoading}
              icon={MessageCircleIcon}
              title={t("chats_none_title")}
              description={t("chats_none_desc")}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-8 w-full max-w-5xl mx-auto p-1">

          {/* Search bar card */}
          <div className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-3.5 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-indigo-500/8 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
                <Input
                  type="text"
                  placeholder={t("chats_search_placeholder")}
                  className="h-11 rounded-2xl border border-border/20 bg-card/20 pl-11 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                  value={conversations.search}
                  onChange={(e) => conversations.setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Date groups */}
          {sortedDates
            .filter((dateKey) =>
              conversations?.search?.length === 0
                ? true
                : groupedConversations?.[dateKey]?.some((doc) =>
                    doc?.title.toLowerCase().includes(conversations?.search?.toLowerCase() || "")
                  )
            )
            .map((dateKey, i) => {
              /* Alternate orb positions per card for visual interest */
              const orbTop = i % 2 === 0;
              return (
                <div
                  key={dateKey}
                  className="relative rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xl p-5 overflow-hidden"
                >
                  {orbTop ? (
                    <>
                      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-indigo-500/6 blur-2xl pointer-events-none" />
                    </>
                  ) : (
                    <>
                      <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-indigo-500/6 blur-2xl pointer-events-none" />
                    </>
                  )}

                  <div className="relative z-10">
                    {/* Date header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/10">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 select-none">
                        {moment(dateKey).format("ddd, MMM D")}
                      </p>
                      <span className="rounded-full border border-border/15 bg-foreground/5 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground/50">
                        {groupedConversations[dateKey].length}
                      </span>
                    </div>

                    {/* Conversation rows */}
                    <div className="space-y-1">
                      {groupedConversations[dateKey].map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => navigate(`/chats/view/${doc.id}`)}
                          className="group flex items-center gap-3 rounded-2xl p-2.5 cursor-pointer transition-all duration-200 hover:bg-foreground/4 select-none"
                        >
                          {/* Thin left bar accent */}
                          <span className="h-8 w-0.5 shrink-0 rounded-full bg-border/30 group-hover:bg-foreground/20 transition-colors duration-200" />

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-[15px] font-semibold text-foreground/80 group-hover:text-foreground/95 transition-colors">
                              {doc.title}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/45">
                              <span>{doc.messages.length} {t("chats_messages_count")}</span>
                              <span>·</span>
                              <span>{moment(doc.updatedAt).format("hh:mm A")}</span>
                            </div>
                          </div>

                          <span className="hidden text-[11px] text-muted-foreground/35 sm:block shrink-0">
                            {moment(doc.updatedAt).fromNow()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </PageLayout>
  );
};

export default ChatsHistory;
