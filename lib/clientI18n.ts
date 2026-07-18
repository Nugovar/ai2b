// Self-contained i18n for the client (business) portal — same pattern as
// expertI18n: read `lang` from the shared provider, index into this map.
import type { Lang } from "@/lib/i18n";

export interface ClientDict {
  brand: string;
  portalTitle: string;
  // Login
  loginTitle: string;
  loginSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  loginBtn: string;
  loggingIn: string;
  loginError: string;
  // Requests
  myRequests: string;
  empty: string;
  emptyHint: string;
  logout: string;
  statusNew: string;
  statusInProgress: string;
  statusDone: string;
  expertOnIt: string;
  adviceTitle: string;
  deliverablesTitle: string;
  amountLabel: string;
  gel: string;
  payInvoiced: string;
  payPaid: string;
  view: string;
  hide: string;
}

const ka: ClientDict = {
  brand: "AI2Business",
  portalTitle: "ბიზნეს-პანელი",
  loginTitle: "შესვლა",
  loginSubtitle: "შეიყვანე ის ელფოსტა და ტელეფონი, რომლითაც განაცხადი დატოვე.",
  emailLabel: "ელფოსტა",
  emailPlaceholder: "you@company.ge",
  phoneLabel: "ტელეფონი",
  phonePlaceholder: "5XX XX XX XX",
  loginBtn: "შესვლა",
  loggingIn: "შესვლა...",
  loginError: "განაცხადი ამ მონაცემებით ვერ მოიძებნა.",
  myRequests: "ჩემი განაცხადები",
  empty: "განაცხადები ვერ მოიძებნა",
  emptyHint: "როცა ჩატიდან განაცხადს დატოვებ, აქ გამოჩნდება.",
  logout: "გასვლა",
  statusNew: "მიღებულია",
  statusInProgress: "მუშავდება",
  statusDone: "დასრულებულია",
  expertOnIt: "ექსპერტი მუშაობს შენს დავალებაზე",
  adviceTitle: "ჩვენი რეკომენდაცია",
  deliverablesTitle: "მზა ნამუშევარი",
  amountLabel: "ღირებულება",
  gel: "₾",
  payInvoiced: "ინვოისი გამოგზავნილია",
  payPaid: "გადახდილია",
  view: "ნახვა",
  hide: "დახურვა",
};

const en: ClientDict = {
  brand: "AI2Business",
  portalTitle: "Business panel",
  loginTitle: "Sign in",
  loginSubtitle: "Enter the email and phone you used when leaving your request.",
  emailLabel: "Email",
  emailPlaceholder: "you@company.ge",
  phoneLabel: "Phone",
  phonePlaceholder: "5XX XX XX XX",
  loginBtn: "Sign in",
  loggingIn: "Signing in...",
  loginError: "No request found with these details.",
  myRequests: "My requests",
  empty: "No requests found",
  emptyHint: "Requests you leave through the chat show up here.",
  logout: "Log out",
  statusNew: "Received",
  statusInProgress: "In progress",
  statusDone: "Completed",
  expertOnIt: "An expert is working on your task",
  adviceTitle: "Our recommendation",
  deliverablesTitle: "Deliverables",
  amountLabel: "Price",
  gel: "GEL",
  payInvoiced: "Invoice sent",
  payPaid: "Paid",
  view: "View",
  hide: "Hide",
};

export const CLIENT_DICT: Record<Lang, ClientDict> = { ka, en };

export function getClientDict(lang: Lang): ClientDict {
  return CLIENT_DICT[lang] ?? ka;
}
