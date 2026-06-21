"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LANG, getDict, type Lang } from "@/lib/i18n";
import type { Attachment, ChatApiResponse, ChatControl, ChatMessage } from "@/lib/types";
import { MARKETING_ONLY } from "@/lib/config";
import ChatWidget from "@/components/ChatWidget";

// Initial quick-reply chips: marketing sub-topics when MARKETING_ONLY, else the
// full 5 category chips. (See lib/config.ts to flip back.)
function initialChipsFor(lang: Lang): string[] {
  const d = getDict(lang);
  return MARKETING_ONLY ? d.chat.marketingChips : d.chat.initialChips;
}

const LANG_STORAGE_KEY = "ai2b_lang";
// Shared id for the embedded chat's input, used by scrollToChat() to focus it.
export const EMBEDDED_INPUT_ID = "embedded-chat-input";
export const EMBEDDED_CHAT_ID = "chat";

interface LeadForm {
  name: string;
  phone: string;
  email: string;
}

interface AppContextValue {
  // language
  lang: Lang;
  setLang: (l: Lang) => void;
  t: ReturnType<typeof getDict>;
  // floating panel
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  scrollToChat: () => void;
  // shared conversation
  messages: ChatMessage[];
  control: ChatControl;
  // Gated lead-form visibility: only true once advice has been given AND the
  // model is in the conversion phase. Prevents premature contact capture.
  showLeadForm: boolean;
  loading: boolean;
  send: (text: string, files?: File[]) => void;
  editLastUserMessage: (text: string) => void;
  // lead capture
  lead: LeadForm;
  setLead: (l: LeadForm) => void;
  leadSubmitting: boolean;
  leadError: string | null;
  leadDone: boolean;
  submitLead: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within a ChatProvider");
  return ctx;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ChatProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const t = useMemo(() => getDict(lang), [lang]);

  // floating panel open state
  const [isOpen, setIsOpen] = useState(false);

  // conversation state (shared by embedded chat + floating widget)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: getDict(DEFAULT_LANG).chat.opening },
  ]);
  const [control, setControl] = useState<ChatControl>({
    phase: "discovery",
    slots: {},
    showLeadForm: false,
    chips: initialChipsFor(DEFAULT_LANG),
  });
  const [loading, setLoading] = useState(false);

  // Advice tracking: the recommendation text given before any handoff, and a
  // flag that the advice phase has occurred (gates the lead form).
  const [adviceText, setAdviceText] = useState("");
  const [hasAdvised, setHasAdvised] = useState(false);

  // lead state
  const [lead, setLead] = useState<LeadForm>({ name: "", phone: "", email: "" });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadDone, setLeadDone] = useState(false);

  // Load persisted language on first mount (default Georgian).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
      if (stored === "ka" || stored === "en") {
        applyLang(stored);
      }
    } catch {
      /* ignore (SSR / privacy mode) */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the conversation into the given language (opening message + chips).
  function applyLang(next: Lang) {
    const d = getDict(next);
    setLangState(next);
    setMessages([{ role: "assistant", content: d.chat.opening }]);
    setControl({
      phase: "discovery",
      slots: {},
      showLeadForm: false,
      chips: initialChipsFor(next),
    });
    setLead({ name: "", phone: "", email: "" });
    setLeadError(null);
    setLeadDone(false);
    setAdviceText("");
    setHasAdvised(false);
  }

  function setLang(next: Lang) {
    if (next === lang) return;
    applyLang(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);

  function scrollToChat() {
    if (typeof document === "undefined") return;
    document.getElementById(EMBEDDED_CHAT_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
    // focus the embedded input shortly after the scroll starts
    window.setTimeout(() => {
      document.getElementById(EMBEDDED_INPUT_ID)?.focus();
    }, 400);
  }

  // Upload any attached files first; returns the persisted attachment list (URLs
  // or base64 data-URL fallbacks). Throws on failure so the caller can surface a
  // localized error instead of sending a half-formed turn.
  async function uploadFiles(files: File[]): Promise<Attachment[]> {
    const form = new FormData();
    files.forEach((f) => form.append("file", f));
    const res = await fetch(`/api/upload?lang=${lang}`, { method: "POST", body: form });
    const data = (await res.json()) as { ok: boolean; attachments?: Attachment[]; error?: string };
    if (!data.ok || !data.attachments) {
      throw new Error(data.error ?? t.chat.attachUploadError);
    }
    return data.attachments;
  }

  // Core turn: upload any files, append the user text + attachments to `base`,
  // call the API, append the reply.
  async function runTurn(base: ChatMessage[], text: string, files?: File[]) {
    setLoading(true);

    // Upload first so the user message carries real attachment URLs. On failure,
    // show the error as a bot message and abort the turn (nothing was sent).
    let attachments: Attachment[] | undefined;
    if (files && files.length > 0) {
      try {
        attachments = await uploadFiles(files);
      } catch (e) {
        setMessages([
          ...base,
          { role: "user", content: text },
          { role: "assistant", content: e instanceof Error ? e.message : t.chat.attachUploadError },
        ]);
        setLoading(false);
        return;
      }
    }

    const nextMessages: ChatMessage[] = [
      ...base,
      { role: "user", content: text, attachments },
    ];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, lang }),
      });
      const data = (await res.json()) as ChatApiResponse;
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setControl(data.control);
      // Capture the advice and mark that the advice phase happened. This gates
      // the lead form so contact is never requested before real advice.
      if (data.control.phase === "advice") {
        setAdviceText(data.reply);
        setHasAdvised(true);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t.chat.errorConnection }]);
    } finally {
      setLoading(false);
    }
  }

  async function send(text: string, files?: File[]) {
    const trimmed = text.trim();
    // Allow sending with only files (no text), but never an empty turn.
    if ((!trimmed && !(files && files.length > 0)) || loading) return;
    await runTurn(messages, trimmed, files);
  }

  // Edit the LAST user message and regenerate: drop that message and everything
  // after it (the old bot reply), then resend the edited text from the same
  // prior context. Lead form is closed so the flow restarts cleanly from there.
  async function editLastUserMessage(newText: string) {
    const trimmed = newText.trim();
    if (!trimmed || loading) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;
    setControl((prev) => ({ ...prev, showLeadForm: false }));
    await runTurn(messages.slice(0, lastUserIdx), trimmed);
  }

  async function submitLead() {
    setLeadError(null);
    // Client-side validation with localized messages.
    if (!lead.name.trim()) return setLeadError(t.chat.errName);
    if (lead.phone.replace(/\D/g, "").length < 9) return setLeadError(t.chat.errPhone);
    if (!EMAIL_RE.test(lead.email.trim())) return setLeadError(t.chat.errEmail);

    setLeadSubmitting(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name.trim(),
          phone: lead.phone.trim(),
          email: lead.email.trim(),
          business_type: control.slots.business_type,
          summary: Object.entries(control.slots)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; "),
          slots: control.slots,
          advice: adviceText,
          conversation: messages,
          // Every file/photo the user shared anywhere in the conversation.
          attachments: messages.flatMap((m) => m.attachments ?? []),
          // Expert-matching task signal captured from the model's control JSON.
          category: control.category,
          required_skills: control.required_skills,
          ai_relevant: control.ai_relevant,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setLeadError(data.error ?? t.chat.errorConnection);
        return;
      }
      setLeadDone(true);
      setControl((prev) => ({ ...prev, showLeadForm: false, chips: [] }));
      setMessages((prev) => [...prev, { role: "assistant", content: t.chat.leadConfirmation }]);
    } catch {
      setLeadError(t.chat.errorConnection);
    } finally {
      setLeadSubmitting(false);
    }
  }

  const value: AppContextValue = {
    lang,
    setLang,
    t,
    isOpen,
    openChat,
    closeChat,
    scrollToChat,
    messages,
    control,
    showLeadForm: control.showLeadForm && hasAdvised,
    loading,
    send,
    editLastUserMessage,
    lead,
    setLead,
    leadSubmitting,
    leadError,
    leadDone,
    submitLead,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <ChatWidget />
    </AppContext.Provider>
  );
}
