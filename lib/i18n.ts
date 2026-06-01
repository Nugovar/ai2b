// Centralized i18n dictionary. ALL user-facing copy lives here - components read
// from it via the active language. Georgian (`ka`) is the default; `en` is the
// English translation. The chatbot language is also driven by this selection
// (passed to the system prompt) so replies + chips match the chosen language.
//
// Style note: no em-dashes or en-dashes in copy. Use short hyphens or rephrase.

export type Lang = "ka" | "en";

export const LANGS: Lang[] = ["ka", "en"];
export const DEFAULT_LANG: Lang = "ka";

interface Dict {
  langToggle: { ka: string; en: string; aria: string };
  nav: { home: string; how: string; services: string; contact: string };
  header: { cta: string; menu: string };
  hero: {
    badge: string;
    titleA: string;
    titleHighlight: string;
    titleB: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  how: {
    title: string;
    subtitle: string;
    steps: { title: string; description: string }[];
  };
  services: {
    title: string;
    subtitle: string;
    items: { title: string; description: string }[];
    ctaTitle: string;
    ctaText: string;
    ctaButton: string;
  };
  contact: { title: string; subtitle: string; button: string };
  footer: {
    tagline: string;
    navHeading: string;
    contactHeading: string;
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    phoneValue: string;
    addressValue: string;
    copyright: string;
  };
  chat: {
    embeddedHeading: string;
    embeddedSubheading: string;
    botName: string;
    botRole: string;
    opening: string;
    initialChips: string[];
    inputPlaceholder: string;
    sendAria: string;
    openAria: string;
    closeAria: string;
    expandAria: string;
    collapseAria: string;
    editAria: string;
    editSave: string;
    editCancel: string;
    minimizedLabel: string;
    leadPrompt: string;
    leadName: string;
    leadPhone: string;
    leadEmail: string;
    leadSubmit: string;
    leadSubmitting: string;
    leadConfirmation: string;
    errorConnection: string;
    errName: string;
    errPhone: string;
    errEmail: string;
    notConfigured: string;
  };
  admin: AdminDict;
}

// Admin panel UI strings. Stored DATA (names, what the customer typed, expert
// names, advice, transcripts) is NEVER translated - only this chrome is.
interface AdminDict {
  panelTitle: string;
  leadsSubtitle: string;
  expertsSubtitle: string;
  backToSite: string;
  total: string;
  source: string;
  sourceSupabase: string;
  sourceMemory: string;
  sourceSeed: string;
  unprotected: string;
  tabs: { leads: string; experts: string };
  login: { title: string; subtitle: string; placeholder: string; button: string; wrong: string };
  emptyTitle: string;
  emptyHint: string;
  th: {
    name: string; phone: string; email: string; category: string; context: string;
    status: string; date: string; details: string;
  };
  view: string;
  close: string;
  del: string;
  delConfirm: string;
  deleting: string;
  status: { new: string; in_progress: string; done: string };
  detail: {
    matchedExperts: string; context: string; advice: string; transcript: string;
    noContext: string; adviceNot: string; transcriptNot: string; noMatches: string;
    topMatch: string; phase2: string; years: string; avg: string; ai: string;
    tiePrefix: string;
  };
  // tie-break criterion labels keyed by machine name from lib/match.ts
  tieBy: Record<string, string>;
  experts: {
    th: { expert: string; aiSkill: string; skills: string; rating: string; status: string; tools: string; internal: string };
    filters: { category: string; seniority: string; availability: string; sortBy: string; all: string; ratingOpt: string; aiSkillOpt: string; experienceOpt: string };
    available: string;
    busy: string;
  };
  seniority: Record<string, string>;
  slots: Record<string, string>;
  skills: Record<string, string>;
  categoryLabel: Record<string, string>;
}

const ka: Dict = {
  langToggle: { ka: "ქარ", en: "ENG", aria: "ენის გადართვა" },
  nav: { home: "მთავარი", how: "როგორ მუშაობს", services: "სერვისები", contact: "კონტაქტი" },
  header: { cta: "დაიწყე ჩატით", menu: "მენიუ" },
  hero: {
    badge: "ქართული AI პლატფორმა ბიზნესისთვის",
    titleA: "AI შენი ბიზნესის სამსახურში. ",
    titleHighlight: "აღწერე საჭიროება,",
    titleB: " მიიღე გადაწყვეტა",
    subtitle:
      "ხელოვნური ინტელექტი აანალიზებს და ასრულებს დავალებებს, ხოლო რთულ შემთხვევებში ერთვება ცოცხალი ექსპერტი. შენთვის მორგებული გადაწყვეტა, სწრაფად.",
    ctaPrimary: "აღწერე შენი საჭიროება",
    ctaSecondary: "როგორ მუშაობს",
  },
  how: {
    title: "როგორ მუშაობს",
    subtitle: "სამი მარტივი ნაბიჯი იდეიდან შესრულებულ დავალებამდე.",
    steps: [
      {
        title: "აღწერ საჭიროებას ჩატში",
        description:
          "მარტივი ენით უთხარი AI-ს, რა გჭირდება ან რა გამოწვევის წინაშე ხარ. ზედმეტი ფორმები არ არის, უბრალოდ ესაუბრე.",
      },
      {
        title: "AI აანალიზებს და არჩევს გადაწყვეტას",
        description:
          "ხელოვნური ინტელექტი სვამს დამაზუსტებელ კითხვებს, აანალიზებს შენს ბიზნესს და გთავაზობს კონკრეტულ, მორგებულ გადაწყვეტას.",
      },
      {
        title: "AI ასრულებს, ან ექსპერტი ერთვება",
        description:
          "მარტივ დავალებებს AI თავად ასრულებს. რთული პროექტებისთვის ავტომატურად გიკავშირებთ შესაბამის ცოცხალ ექსპერტს.",
      },
    ],
  },
  services: {
    title: "სერვისები",
    subtitle: "ხუთი ძირითადი მიმართულება, ერთ სივრცეში. აღწერე საჭიროება და მოვძებნით შესაბამის ექსპერტს.",
    items: [
      { title: "მარკეტინგი", description: "ციფრული რეკლამა, სოციალური ქსელები, კონტენტი და რეელსები. სტრატეგია, რომელიც ზრდის გაყიდვებს." },
      { title: "დეველოპმენტი", description: "ვებსაიტები, ლენდინგ გვერდები, ჩატბოტები და ბიზნეს-პროცესების ავტომატიზაცია." },
      { title: "იურიდიული", description: "ხელშეკრულებები, კომპანიის რეგისტრაცია და სამართლებრივი კონსულტაცია." },
      { title: "დიზაინი / ბრენდინგი", description: "ლოგო, ბრენდბუქი, ვიზუალური იდენტობა და ფოტო/ვიდეო კონტენტი." },
      { title: "ბიზნეს-კონსალტინგი", description: "ბიზნეს-მოდელი, ფინანსები და ზრდის სტრატეგია გამოცდილ ექსპერტებთან ერთად." },
    ],
    ctaTitle: "ვერ პოულობ რაც გჭირდება?",
    ctaText: "აღწერე შენი საჭიროება ჩატში და AI მოგიძებნის შესაბამის გადაწყვეტას.",
    ctaButton: "დაიწყე ჩატით",
  },
  contact: {
    title: "მზად ხარ დასაწყებად?",
    subtitle: "აღწერე შენი საჭიროება და მიიღე შენთვის მორგებული გადაწყვეტა, სულ რამდენიმე წუთში.",
    button: "აღწერე შენი საჭიროება",
  },
  footer: {
    tagline: "ქართული AI პლატფორმა მცირე და საშუალო ბიზნესისთვის. აღწერე საჭიროება, მიიღე გადაწყვეტა.",
    navHeading: "ნავიგაცია",
    contactHeading: "კონტაქტი",
    emailLabel: "ელ. ფოსტა:",
    phoneLabel: "ტელეფონი:",
    addressLabel: "მისამართი:",
    phoneValue: "+995 (XXX) XXX XXX",
    addressValue: "თბილისი, საქართველო",
    copyright: "© 2026 AI2Business",
  },
  chat: {
    embeddedHeading: "ესაუბრე AI კონსულტანტს",
    embeddedSubheading: "აღწერე საჭიროება და მიიღე მორგებული გადაწყვეტა ახლავე.",
    botName: "AI2Business",
    botRole: "ციფრული კონსულტანტი",
    opening:
      "გამარჯობა! 👋 მოკლედ აღწერეთ რა გჭირდებათ ან რა გამოწვევის წინაშე ხართ. დაგისვამთ რამდენიმე კითხვას და შემოგთავაზებთ კონკრეტულ გადაწყვეტას.",
    initialChips: ["მარკეტინგი", "დეველოპმენტი", "იურიდიული", "დიზაინი / ბრენდინგი", "ბიზნეს-კონსალტინგი"],
    inputPlaceholder: "დაწერეთ შეტყობინება...",
    sendAria: "გაგზავნა",
    openAria: "ჩატის გახსნა",
    closeAria: "ჩატის დახურვა",
    expandAria: "სრულ ეკრანზე გაშლა",
    collapseAria: "სრული ეკრანიდან გამოსვლა",
    editAria: "შეტყობინების რედაქტირება",
    editSave: "გაგზავნა",
    editCancel: "გაუქმება",
    minimizedLabel: "ჩატი",
    leadPrompt: "დატოვეთ საკონტაქტო ინფორმაცია და ჩვენი ექსპერტი დაგიკავშირდებათ:",
    leadName: "სახელი",
    leadPhone: "ტელეფონი",
    leadEmail: "ელ. ფოსტა",
    leadSubmit: "გაგზავნა",
    leadSubmitting: "იგზავნება...",
    leadConfirmation: "მადლობა! თქვენი დავალება გაიგზავნა ჩვენს ექსპერტთან, მალე დაგიკავშირდებით. ✅",
    errorConnection: "ბოდიში, კავშირი ვერ დამყარდა. გთხოვთ, სცადოთ ხელახლა. 🙏",
    errName: "გთხოვთ, შეიყვანოთ სახელი.",
    errPhone: "გთხოვთ, შეიყვანოთ სწორი ტელეფონის ნომერი.",
    errEmail: "გთხოვთ, შეიყვანოთ სწორი ელ. ფოსტა.",
    notConfigured: "ჩატი ჯერ არ არის კონფიგურირებული (OPENAI_API_KEY აკლია). დაამატეთ გასაღები .env.local-ში.",
  },
  admin: {
    panelTitle: "ადმინ პანელი",
    leadsSubtitle: "ჩატიდან მიღებული ლიდები",
    expertsSubtitle: "ექსპერტების დირექტორია",
    backToSite: "← საიტზე დაბრუნება",
    total: "სულ",
    source: "მონაცემთა წყარო",
    sourceSupabase: "Supabase",
    sourceMemory: "მეხსიერება (demo)",
    sourceSeed: "seed (demo)",
    unprotected: "⚠ პანელი დაუცველია (ADMIN_PASSWORD არ არის დაყენებული)",
    tabs: { leads: "ლიდები", experts: "ექსპერტები" },
    login: {
      title: "ადმინ პანელი",
      subtitle: "შეიყვანეთ პაროლი გასაგრძელებლად",
      placeholder: "პაროლი",
      button: "შესვლა",
      wrong: "პაროლი არასწორია. სცადეთ ხელახლა.",
    },
    emptyTitle: "ჯერ ლიდები არ არის",
    emptyHint: "ჩატში ექსპერტის გამოძახების შემდეგ ლიდები აქ გამოჩნდება.",
    th: {
      name: "სახელი", phone: "ტელეფონი", email: "ელ. ფოსტა", category: "კატეგორია",
      context: "კონტექსტი", status: "სტატუსი", date: "თარიღი", details: "დეტალები",
    },
    view: "ნახვა",
    close: "დახურვა",
    del: "წაშლა",
    delConfirm: "ნამდვილად წაშალოთ ეს ლიდი? მოქმედება შეუქცევადია.",
    deleting: "იშლება...",
    status: { new: "ახალი", in_progress: "მუშავდება", done: "დასრულებული" },
    detail: {
      matchedExperts: "შესაბამისი ექსპერტები",
      context: "შეგროვებული კონტექსტი",
      advice: "ბოტის რჩევა (handoff-მდე)",
      transcript: "სრული მიმოწერა",
      noContext: "მონაცემი არ არის",
      adviceNot: "რჩევა არ ჩაიწერა",
      transcriptNot: "მიმოწერა არ ჩაიწერა",
      noMatches: "დავალების კატეგორია/უნარები არ დაფიქსირდა, ან ამ კატეგორიაში ექსპერტი არ მოიძებნა.",
      topMatch: "ტოპ შესაბამისობა",
      phase2: "Phase 2: #1 ექსპერტს დავალება ავტომატურად გაეგზავნება (ამჟამად მხოლოდ ჩვენება).",
      years: "წ.",
      avg: "საშ.",
      ai: "AI",
      tiePrefix: "ტოლი ქულა → გადაწყვიტა:",
    },
    tieBy: {
      task_score: "დავალების ქულა",
      all_avg: "ყველა უნარის საშუალო",
      ai_skill: "AI უნარი",
      overall_rating: "რეიტინგი",
      seniority: "სენიორობა",
      years: "გამოცდილების წლები",
    },
    experts: {
      th: {
        expert: "ექსპერტი", aiSkill: "AI უნარი", skills: "უნარები (0-10)", rating: "რეიტინგი",
        status: "სტატუსი", tools: "ხელსაწყოები", internal: "შიდა (admin only)",
      },
      filters: {
        category: "კატეგორია", seniority: "სენიორობა", availability: "ხელმისაწვდომობა", sortBy: "დახარისხება",
        all: "ყველა", ratingOpt: "რეიტინგი ⭐", aiSkillOpt: "AI უნარი", experienceOpt: "გამოცდილება",
      },
      available: "თავისუფალი",
      busy: "დაკავებული",
    },
    seniority: { junior: "ჯუნიორი", middle: "მიდლი", senior: "სენიორი" },
    slots: {
      business_type: "ბიზნესის ტიპი", location: "მდებარეობა", branches: "ფილიალები", city: "ქალაქი",
      district: "უბანი / რაიონი", street: "ქუჩა", traction: "ბრუნვა / მომხმარებლები", audience: "აუდიტორია",
      channels: "არხები", budget: "ბიუჯეტი", timeline: "ვადები", goal: "მიზანი",
    },
    skills: {
      logo: "ლოგო", branding: "ბრენდინგი", poster: "პოსტერი", social_media: "სოც. მედია",
      business_card: "სავიზიტო ბარათი", ui_ux: "UI/UX", illustration: "ილუსტრაცია",
    },
    categoryLabel: { "დიზაინი/ბრენდინგი": "დიზაინი/ბრენდინგი" },
  },
};

const en: Dict = {
  langToggle: { ka: "ქარ", en: "ENG", aria: "Switch language" },
  nav: { home: "Home", how: "How it works", services: "Services", contact: "Contact" },
  header: { cta: "Start with chat", menu: "Menu" },
  hero: {
    badge: "Georgian AI platform for business",
    titleA: "AI at the service of your business. ",
    titleHighlight: "Describe your need,",
    titleB: " get a solution",
    subtitle:
      "AI analyzes and executes tasks, and a human expert steps in on the tricky ones. A solution tailored to you, fast.",
    ctaPrimary: "Describe your need",
    ctaSecondary: "How it works",
  },
  how: {
    title: "How it works",
    subtitle: "Three simple steps from idea to a finished task.",
    steps: [
      {
        title: "Describe your need in the chat",
        description:
          "Tell the AI in plain language what you need or what challenge you face. No tedious forms, just talk.",
      },
      {
        title: "AI analyzes and picks a solution",
        description:
          "The AI asks clarifying questions, analyzes your business, and proposes a concrete, tailored solution.",
      },
      {
        title: "AI executes, or an expert steps in",
        description:
          "Simple tasks the AI handles itself. For complex projects, we connect you with the right human expert automatically.",
      },
    ],
  },
  services: {
    title: "Services",
    subtitle: "Five core directions in one place. Describe your need and we'll match you with the right expert.",
    items: [
      { title: "Marketing", description: "Digital ads, social media, content and reels. A strategy that grows your sales." },
      { title: "Development", description: "Websites, landing pages, chatbots and business process automation." },
      { title: "Legal", description: "Contracts, company registration and legal advice for your business." },
      { title: "Design / Branding", description: "Logo, brand book, visual identity and photo or video content." },
      { title: "Business consulting", description: "Business model, finances and growth strategy with experienced experts." },
    ],
    ctaTitle: "Can't find what you need?",
    ctaText: "Describe your need in the chat and the AI will find the right solution.",
    ctaButton: "Start with chat",
  },
  contact: {
    title: "Ready to get started?",
    subtitle: "Describe your need and get a solution tailored to you in just a few minutes.",
    button: "Describe your need",
  },
  footer: {
    tagline: "Georgian AI platform for small and medium business. Describe your need, get a solution.",
    navHeading: "Navigation",
    contactHeading: "Contact",
    emailLabel: "Email:",
    phoneLabel: "Phone:",
    addressLabel: "Address:",
    phoneValue: "+995 (XXX) XXX XXX",
    addressValue: "Tbilisi, Georgia",
    copyright: "© 2026 AI2Business",
  },
  chat: {
    embeddedHeading: "Talk to the AI consultant",
    embeddedSubheading: "Describe your need and get a tailored solution right now.",
    botName: "AI2Business",
    botRole: "Digital consultant",
    opening:
      "Hi! 👋 Briefly describe what you need or what challenge you're facing. I'll ask a few questions and offer you a concrete solution.",
    initialChips: ["Marketing", "Development", "Legal", "Design / Branding", "Business consulting"],
    inputPlaceholder: "Type a message...",
    sendAria: "Send",
    openAria: "Open chat",
    closeAria: "Close chat",
    expandAria: "Expand to fullscreen",
    collapseAria: "Exit fullscreen",
    editAria: "Edit message",
    editSave: "Send",
    editCancel: "Cancel",
    minimizedLabel: "Chat",
    leadPrompt: "Leave your contact details and our expert will reach out:",
    leadName: "Name",
    leadPhone: "Phone",
    leadEmail: "Email",
    leadSubmit: "Send",
    leadSubmitting: "Sending...",
    leadConfirmation: "Thank you! Your request has been sent to our expert. We'll be in touch shortly. ✅",
    errorConnection: "Sorry, the connection failed. Please try again. 🙏",
    errName: "Please enter your name.",
    errPhone: "Please enter a valid phone number.",
    errEmail: "Please enter a valid email.",
    notConfigured: "The chat is not configured yet (OPENAI_API_KEY is missing). Add the key to .env.local.",
  },
  admin: {
    panelTitle: "Admin panel",
    leadsSubtitle: "Leads captured from the chat",
    expertsSubtitle: "Experts directory",
    backToSite: "← Back to site",
    total: "Total",
    source: "Data source",
    sourceSupabase: "Supabase",
    sourceMemory: "in-memory (demo)",
    sourceSeed: "seed (demo)",
    unprotected: "⚠ Panel is unprotected (ADMIN_PASSWORD not set)",
    tabs: { leads: "Leads", experts: "Experts" },
    login: {
      title: "Admin panel",
      subtitle: "Enter the password to continue",
      placeholder: "Password",
      button: "Sign in",
      wrong: "Wrong password. Please try again.",
    },
    emptyTitle: "No leads yet",
    emptyHint: "Leads appear here after the chat hands off to an expert.",
    th: {
      name: "Name", phone: "Phone", email: "Email", category: "Category",
      context: "Context", status: "Status", date: "Date", details: "Details",
    },
    view: "View",
    close: "Close",
    del: "Delete",
    delConfirm: "Delete this lead? This cannot be undone.",
    deleting: "Deleting...",
    status: { new: "New", in_progress: "In progress", done: "Done" },
    detail: {
      matchedExperts: "Matched experts",
      context: "Collected context",
      advice: "Bot advice (before handoff)",
      transcript: "Full transcript",
      noContext: "No data",
      adviceNot: "No advice recorded",
      transcriptNot: "No transcript recorded",
      noMatches: "No task category/skills were captured, or no expert was found in this category.",
      topMatch: "Top match",
      phase2: "Phase 2: the task will be auto-sent to the #1 expert (display only for now).",
      years: "yrs",
      avg: "avg",
      ai: "AI",
      tiePrefix: "tie on score → decided by:",
    },
    tieBy: {
      task_score: "task score",
      all_avg: "avg of all skills",
      ai_skill: "AI skill",
      overall_rating: "rating",
      seniority: "seniority",
      years: "years of experience",
    },
    experts: {
      th: {
        expert: "Expert", aiSkill: "AI skill", skills: "Skills (0-10)", rating: "Rating",
        status: "Status", tools: "Tools", internal: "Internal (admin only)",
      },
      filters: {
        category: "Category", seniority: "Seniority", availability: "Availability", sortBy: "Sort by",
        all: "All", ratingOpt: "Rating ⭐", aiSkillOpt: "AI skill", experienceOpt: "Experience",
      },
      available: "Available",
      busy: "Busy",
    },
    seniority: { junior: "Junior", middle: "Middle", senior: "Senior" },
    slots: {
      business_type: "Business type", location: "Location", branches: "Branches", city: "City",
      district: "District", street: "Street", traction: "Traction", audience: "Audience",
      channels: "Channels", budget: "Budget", timeline: "Timeline", goal: "Goal",
    },
    skills: {
      logo: "Logo", branding: "Branding", poster: "Poster", social_media: "Social media",
      business_card: "Business card", ui_ux: "UI/UX", illustration: "Illustration",
    },
    categoryLabel: { "დიზაინი/ბრენდინგი": "Design / Branding" },
  },
};

export const DICT: Record<Lang, Dict> = { ka, en };

export function getDict(lang: Lang): Dict {
  return DICT[lang] ?? DICT[DEFAULT_LANG];
}
