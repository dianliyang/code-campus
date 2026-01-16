"use client";

import { useTransition } from "react";
import { setLanguage } from "@/actions/language";
import { Locale } from "@/lib/i18n";

export default function LanguageSwitcher({ currentLang }: { currentLang: Locale }) {
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (lang: Locale) => {
    startTransition(() => {
      setLanguage(lang);
    });
  };

  return (
    <div className="flex gap-4">
      <button 
        onClick={() => handleLanguageChange('en')}
        disabled={isPending}
        className={`text-[10px] font-black uppercase tracking-widest transition-colors ${currentLang === 'en' ? 'text-brand-blue' : 'text-gray-400 hover:text-gray-900'}`}
      >
        English
      </button>
      <span className="text-gray-300 text-[10px] font-black">/</span>
      <button 
        onClick={() => handleLanguageChange('zh')}
        disabled={isPending}
        className={`text-[10px] font-black uppercase tracking-widest transition-colors ${currentLang === 'zh' ? 'text-brand-blue' : 'text-gray-400 hover:text-gray-900'}`}
      >
        中文
      </button>
    </div>
  );
}
