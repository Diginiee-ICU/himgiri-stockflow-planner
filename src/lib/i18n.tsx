import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const dict = {
  dashboard: ["Dashboard", "डैशबोर्ड"],
  inventory: ["Inventory", "इन्वेंटरी"],
  products: ["Products", "उत्पाद"],
  production: ["Production", "उत्पादन"],
  scan: ["Scan QR", "QR स्कैन"],
  reports: ["Reports", "रिपोर्ट"],
  leads: ["Website leads", "वेबसाइट पूछताछ"],
  employees: ["Employees", "कर्मचारी"],
  settings: ["Settings", "सेटिंग्स"],
  signOut: ["Sign out", "लॉग आउट"],
  signIn: ["Sign in", "लॉग इन"],
  email: ["Email", "ईमेल"],
  password: ["Password", "पासवर्ड"],
  search: ["Search by name or SKU", "नाम या SKU से खोजें"],
  available: ["Available", "उपलब्ध"],
  reserved: ["Reserved", "आरक्षित"],
  damaged: ["Damaged", "क्षतिग्रस्त"],
  minimum: ["Minimum", "न्यूनतम"],
  location: ["Location", "स्थान"],
  lowStock: ["Low stock", "कम स्टॉक"],
  readOnly: ["View only — you cannot change stock", "केवल देखने के लिए — आप स्टॉक नहीं बदल सकते"],
  capacity: ["Can build now", "अभी बना सकते हैं"],
  totalItems: ["Inventory items", "कुल आइटम"],
  rawStock: ["Raw material units", "कच्चा माल"],
  componentStock: ["Component units", "पुर्जे"],
  assemblyStock: ["Assembled units", "असेंबली"],
  finishedStock: ["Finished ladders", "तैयार सीढ़ियाँ"],
  recent: ["Recent stock movements", "हाल की स्टॉक गतिविधि"],
  demo: ["DEMO / UNVERIFIED", "डेमो / असत्यापित"],
  language: ["Language", "भाषा"],
  simpleMode: ["Simple Mode", "सरल मोड"],
  back: ["Back", "वापस"],
  bom: ["Bill of materials", "सामग्री सूची"],
  history: ["Stock history", "स्टॉक इतिहास"],
  stockAction: ["Stock action", "स्टॉक कार्य"],
  comingSoon: ["Coming in the next phase", "अगले चरण में आ रहा है"],
  requests: ["Material requests", "सामग्री मांग"],
  stockCheck: ["Stock check", "स्टॉक जाँच"],
  menu: ["Menu", "मेनू"],
} as const;

export type TKey = keyof typeof dict;
type Lang = "en" | "hi";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string; simple: boolean; setSimple: (s: boolean) => void }>({
  lang: "en", setLang: () => {}, t: (k) => dict[k][0], simple: false, setSimple: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangS] = useState<Lang>("en");
  const [simple, setSimpleS] = useState(false);
  useEffect(() => {
    const l = localStorage.getItem("hg-lang");
    if (l === "hi" || l === "en") setLangS(l);
    setSimpleS(localStorage.getItem("hg-simple") === "1");
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = simple ? "20px" : "";
    document.documentElement.lang = lang;
  }, [simple, lang]);
  const setLang = (l: Lang) => { setLangS(l); localStorage.setItem("hg-lang", l); };
  const setSimple = (s: boolean) => { setSimpleS(s); localStorage.setItem("hg-simple", s ? "1" : "0"); };
  const t = (k: TKey) => dict[k][lang === "en" ? 0 : 1];
  return <Ctx.Provider value={{ lang, setLang, t, simple, setSimple }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
