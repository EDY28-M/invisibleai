import {
  Dispatch,
  SetStateAction,
  RefObject,
  KeyboardEvent,
  ChangeEvent,
  ClipboardEvent,
} from "react";

export interface UseCompletionReturn {

  input: string;

  setInput: (value: string) => void;

  response: string;

  setResponse: (value: string) => void;

  isLoading: boolean;

  error: string | null;

  attachedFiles: any[];

  addFile: (file: File) => Promise<void>;

  removeFile: (fileId: string) => void;

  clearFiles: () => void;

  submit: (speechText?: string) => Promise<void>;

  cancel: () => void;

  reset: () => void;

  setState: Dispatch<SetStateAction<any>>;

  enableVAD: boolean;

  setEnableVAD: Dispatch<SetStateAction<boolean>>;

  micOpen: boolean;

  setMicOpen: Dispatch<SetStateAction<boolean>>;

  currentConversationId: string | null;

  conversationHistory: any[];

  loadConversation: (conversation: any) => void;

  startNewConversation: () => void;

  messageHistoryOpen: boolean;

  setMessageHistoryOpen: Dispatch<SetStateAction<boolean>>;

  keepEngaged: boolean;

  setKeepEngaged: Dispatch<SetStateAction<boolean>>;

  screenshotConfiguration: any;

  setScreenshotConfiguration: Dispatch<SetStateAction<any>>;

  handleScreenshotSubmit: (base64: string, prompt?: string) => Promise<void>;

  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;

  handleKeyPress: (e: KeyboardEvent) => void;

  handlePaste: (e: ClipboardEvent) => Promise<void>;

  isPopoverOpen: boolean;

  scrollAreaRef: RefObject<HTMLDivElement | null>;

  resizeWindow: (expanded: boolean) => Promise<void>;

  isFilesPopoverOpen: boolean;

  setIsFilesPopoverOpen: Dispatch<SetStateAction<boolean>>;

  onRemoveAllFiles: () => void;

  inputRef: RefObject<HTMLInputElement | null>;

  captureScreenshot: () => Promise<void>;

  isScreenshotLoading: boolean;
}

export type UseCompletionHook = () => UseCompletionReturn;
