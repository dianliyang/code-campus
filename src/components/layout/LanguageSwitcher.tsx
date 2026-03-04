"use client";

import { useTransition } from "react";
import { setLanguage } from "@/actions/language";
import { Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default function LanguageSwitcher({ currentLang }: {currentLang: Locale;}) {
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (lang: Locale) => {
    startTransition(() => {
      setLanguage(lang);
    });
  };

  return (
    <div className="flex gap-4">
      <Button variant="outline"
      onClick={() => handleLanguageChange('en')}
      disabled={isPending}>

        
        English
      </Button>
      <span className="text-gray-300 text-[10px] font-black">/</span>
      <Button variant="outline"
      onClick={() => handleLanguageChange('zh')}
      disabled={isPending}>

        
        中文
      </Button>
    </div>);

}