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
import type { ChatApiResponse, ChatControl, ChatMessage } from "@/lib/types";
import ChatWidget from "@/components/ChatWidget";

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
  send: (text: string) => void;
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
    chips: getDict(DEFAULT_LANG).chat.initialChips,
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
      chips: d.chat.initialChips,
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

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setLoading(true);

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
