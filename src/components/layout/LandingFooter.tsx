import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import Image from "next/image";
import { Locale } from "@/lib/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LandingFooter({ dict, lang }: { dict: any; lang: Locale }) {
  return (
    <footer className="py-10 bg-slate-50 border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image
            src="/code-campus-logo-bw.svg"
            alt="CodeCampus"
            width={20}
            height={20}
          />
          <span className="text-sm text-slate-400">
            {dict.copyright}
          </span>
        </div>
        <LanguageSwitcher currentLang={lang} />
      </div>
    </footer>
  );
}
