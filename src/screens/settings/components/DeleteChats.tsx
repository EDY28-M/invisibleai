import { Loader2, TrashIcon } from "lucide-react";
import { Button, Header } from "@/components";
import { UseSettingsReturn } from "@/types";
import { useState } from "react";

export const DeleteChats = ({
  handleDeleteAllChatsConfirm,
  showDeleteConfirmDialog,
  setShowDeleteConfirmDialog,
}: UseSettingsReturn) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAllChats = () => {
    setIsDeleting(true);
    handleDeleteAllChatsConfirm();
    setTimeout(() => {
      setIsDeleting(false);
    }, 2000);
  };

  return (
    <div id="delete-chats" className="space-y-3">
      <Header
        title="Delete Chat History"
        description="Permanently delete all your chat conversations and history. This action cannot be undone and will remove all stored conversations from your local storage."
        isMainTitle
      />

      <div className="space-y-2">
        {isDeleting && (
          <div className="p-3 bg-green-500/5 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl backdrop-blur-sm shadow-sm">
            <p className="text-xs font-medium">
              All chat history has been successfully deleted.
            </p>
          </div>
        )}

        <Button
          onClick={() => setShowDeleteConfirmDialog(true)}
          disabled={isDeleting}
          variant="destructive"
          className="w-full h-10 rounded-xl transition-all"
          title="Delete all chat history"
        >
          {isDeleting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete All Chats
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      {showDeleteConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card/95 border border-border/40 backdrop-blur-md rounded-2xl p-6 max-w-md mx-4 shadow-2xl shadow-black/25">
            <h3 className="text-lg font-semibold mb-2">
              Delete All Chat History
            </h3>
            <p className="text-sm text-muted-foreground/80 mb-4">
              Are you sure you want to delete all chat history? This action
              cannot be undone and will permanently remove all stored
              conversations.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirmDialog(false)}
                className="h-9 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-all"
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteAllChats} className="h-9 rounded-xl transition-all">
                Delete All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
