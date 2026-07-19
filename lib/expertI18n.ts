// Self-contained i18n for the expert portal (kept out of the big admin Dict so
// the portal stays a standalone surface). Read `lang` from the shared
// ChatProvider (useApp) and index into this map.
import type { Lang } from "@/lib/i18n";

export interface ExpertDict {
  brand: string;
  portalTitle: string;
  // Login
  loginTitle: string;
  loginSubtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  codeLabel: string;
  codePlaceholder: string;
  loginBtn: string;
  loginError: string;
  loggingIn: string;
  // Feed
  greeting: string; // "{name}, გამარჯობა" handled by caller
  myTasks: string;
  openCount: string; // e.g. "{n} მიმდინარე"
  doneCount: string; // e.g. "{n} დასრულებული"
  noTasks: string;
  noTasksHint: string;
  logout: string;
  // Task card / detail
  taskFrom: string; // "{business_type} · {category}"
  briefTitle: string;
  noBrief: string;
  filesTitle: string;
  detailsTitle: string;
  skillsTitle: string;
  aiFlag: string; // badge: AI-relevant task
  back: string;
  // Submit / rate
  submitTitle: string;
  submitHint: string;
  rateAccepted: string;
  rateAcceptedHint: string;
  rateEdited: string;
  rateEditedHint: string;
  rateRejected: string;
  rateRejectedHint: string;
  attachTitle: string; // "upload your work (optional)"
  attachBtn: string;
  uploading: string;
  uploadError: string;
  deliverablesTitle: string; // shown on a done task
  submitBtn: string;
  submitting: string;
  submitError: string;
  submitted: string; // done confirmation
  statusNew: string;
  statusInProgress: string;
  statusDone: string;
}

const ka: ExpertDict = {
  brand: "AI2Business",
  portalTitle: "ექსპერტის პორტალი",
  loginTitle: "შესვლა",
  loginSubtitle: "შეიყვანე შენი ელფოსტა და პირადი კოდი, რომელიც ადმინისგან მიიღე.",
  emailLabel: "ელფოსტა",
  emailPlaceholder: "you@ai2b.ge",
  codeLabel: "პირადი კოდი",
  codePlaceholder: "მაგ. NINO-4821",
  loginBtn: "შესვლა",
  loginError: "ელფოსტა ან კოდი არასწორია.",
  loggingIn: "შესვლა...",
  greeting: "გამარჯობა",
  myTasks: "ჩემი დავალებები",
  openCount: "მიმდინარე",
  doneCount: "დასრულებული",
  noTasks: "ჯერ დავალება არ გაქვს",
  noTasksHint: "როცა ადმინი დავალებას მოგანიჭებს, აქ გამოჩნდება.",
  logout: "გასვლა",
  taskFrom: "დავალება",
  briefTitle: "AI ბრიფი",
  noBrief: "ბრიფი არ არის.",
  filesTitle: "ფაილები",
  detailsTitle: "დეტალები",
  skillsTitle: "საჭირო უნარები",
  aiFlag: "AI-ზე ორიენტირებული",
  back: "უკან",
  submitTitle: "დაასრულე და შეაფასე AI ბრიფი",
  submitHint: "რამდენად გამოსადეგი იყო AI-ის ბრიფი, როცა დავალებას ასრულებდი?",
  rateAccepted: "გამოვიყენე როგორც იყო",
  rateAcceptedHint: "ბრიფი კარგი იყო, თითქმის უცვლელად წავიდა",
  rateEdited: "შევასწორე",
  rateEditedHint: "სასარგებლო იყო, მაგრამ საგრძნობლად გადავამუშავე",
  rateRejected: "თავიდან გავაკეთე",
  rateRejectedHint: "ბრიფი გამოუსადეგარი იყო, ნულიდან დავიწყე",
  attachTitle: "ატვირთე ნამუშევარი (არასავალდებულო)",
  attachBtn: "ფაილების მიმაგრება",
  uploading: "იტვირთება...",
  uploadError: "ატვირთვა ვერ მოხერხდა",
  deliverablesTitle: "ნამუშევარი",
  submitBtn: "დასრულება",
  submitting: "იგზავნება...",
  submitError: "შენახვა ვერ მოხერხდა. სცადე ხელახლა.",
  submitted: "დასრულებულია — მადლობა შეფასებისთვის ✅",
  statusNew: "ახალი",
  statusInProgress: "მიმდინარე",
  statusDone: "დასრულებული",
};

const en: ExpertDict = {
  brand: "AI2Business",
  portalTitle: "Expert Portal",
  loginTitle: "Sign in",
  loginSubtitle: "Enter your email and the personal code you got from the admin.",
  emailLabel: "Email",
  emailPlaceholder: "you@ai2b.ge",
  codeLabel: "Personal code",
  codePlaceholder: "e.g. NINO-4821",
  loginBtn: "Sign in",
  loginError: "Email or code is incorrect.",
  loggingIn: "Signing in...",
  greeting: "Hi",
  myTasks: "My tasks",
  openCount: "open",
  doneCount: "done",
  noTasks: "No tasks yet",
  noTasksHint: "When the admin assigns you a task, it shows up here.",
  logout: "Log out",
  taskFrom: "Task",
  briefTitle: "AI brief",
  noBrief: "No brief provided.",
  filesTitle: "Files",
  detailsTitle: "Details",
  skillsTitle: "Required skills",
  aiFlag: "AI-oriented",
  back: "Back",
  submitTitle: "Complete & rate the AI brief",
  submitHint: "How usable was the AI's brief when you did the task?",
  rateAccepted: "Used it as-is",
  rateAcceptedHint: "The brief was good, went out almost unchanged",
  rateEdited: "Edited it",
  rateEditedHint: "Useful, but I reworked it significantly",
  rateRejected: "Started over",
  rateRejectedHint: "The brief was useless, I started from scratch",
  attachTitle: "Upload your work (optional)",
  attachBtn: "Attach files",
  uploading: "Uploading...",
  uploadError: "Upload failed",
  deliverablesTitle: "Deliverables",
  submitBtn: "Complete",
  submitting: "Submitting...",
  submitError: "Couldn't save. Please try again.",
  submitted: "Completed — thanks for the rating ✅",
  statusNew: "New",
  statusInProgress: "In progress",
  statusDone: "Done",
};

export const EXPERT_DICT: Record<Lang, ExpertDict> = { ka, en };

export function getExpertDict(lang: Lang): ExpertDict {
  return EXPERT_DICT[lang] ?? ka;
}
