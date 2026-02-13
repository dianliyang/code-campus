import { Github } from "lucide-react";
import type { Dictionary } from "@/lib/dictionary";
import DeleteAccount from "@/components/profile/DeleteAccount";

interface SecurityIdentitySectionProps {
  dict: Dictionary["dashboard"]["profile"];
}

export default function SecurityIdentitySection({ dict }: SecurityIdentitySectionProps) {
  return (
    <div className="pt-16">
      <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-12">{dict.security_title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="space-y-12">
          <div className="flex gap-6 items-start">
            <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-2xl">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{dict.github_title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed mt-1">{dict.github_desc}</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-brand-green uppercase tracking-widest bg-green-50 w-fit px-3 py-1 rounded-lg border border-green-100">
                <span className="w-1.5 h-1.5 bg-brand-green rounded-full"></span>
                {dict.connected}
              </div>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{dict.google_title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed mt-1">{dict.google_desc}</p>
              <button className="mt-4 flex items-center gap-2 text-[10px] font-black text-brand-blue uppercase tracking-widest bg-blue-50/50 w-fit px-3 py-1 rounded-lg border border-blue-100/50 hover:bg-blue-50 cursor-pointer">
                {dict.link_account}
              </button>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center text-2xl">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{dict.apple_title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed mt-1">{dict.apple_desc}</p>
              <button className="mt-4 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 w-fit px-3 py-1 rounded-lg border border-gray-100 hover:bg-gray-100 cursor-pointer">
                {dict.link_account}
              </button>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6" viewBox="0 0 23 23">
                <rect width="10.5" height="10.5" fill="#f25022"/>
                <rect width="10.5" height="10.5" x="11.5" fill="#7fbb00"/>
                <rect width="10.5" height="10.5" y="11.5" fill="#00a4ef"/>
                <rect width="10.5" height="10.5" x="11.5" y="11.5" fill="#ffb900"/>
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{dict.microsoft_title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed mt-1">{dict.microsoft_desc}</p>
              <button className="mt-4 flex items-center gap-2 text-[10px] font-black text-[#00a1f1] uppercase tracking-widest bg-blue-50/30 w-fit px-3 py-1 rounded-lg border border-blue-100/30 hover:bg-blue-50 cursor-pointer">
                {dict.link_account}
              </button>
            </div>
          </div>
        </div>

        <DeleteAccount dict={dict} />
      </div>
    </div>
  );
}
