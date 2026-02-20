import Image from "next/image";
import Link from "next/link";
import OrbitingCircles from "@/components/home/OrbitingCircles";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";

export default async function VerifyRequestPage() {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-hidden">
      {/* Left Side: Immersive Branding & Globe */}
      <div className="hidden lg:flex flex-col justify-between bg-gray-950 p-16 relative overflow-hidden">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <Image 
              src="/code-campus-logo-bw.svg" 
              alt="CodeCampus" 
              width={48} 
              height={48} 
              className="w-12 h-12 brightness-200"
            />
            <div className="flex flex-col -space-y-1.5">
              <span className="text-2xl font-bold tracking-tight text-white">CodeCampus</span>
              <span className="text-xs font-medium text-brand-blue">{dict.navbar.global_network}</span>
            </div>
          </Link>
        </div>

        {/* Globe Container */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
           <div className="w-[120%] h-[120%]">
             <OrbitingCircles />
           </div>
        </div>

        <div className="relative z-10 max-w-md">
           <h2 className="text-4xl font-bold text-white tracking-tight mb-6 leading-none">
             {dict.dashboard.login.verify_title.split(' ')[0]} <br /> {dict.dashboard.login.verify_title.split(' ').slice(1).join(' ')}.
           </h2>
           <p className="text-gray-400 font-medium leading-relaxed">
             {dict.dashboard.login.verify_desc}
           </p>
        </div>

        <div className="relative z-10">
           <p className="text-sm text-slate-500">
             {dict.footer.copyright}
           </p>
        </div>
      </div>

      {/* Right Side: Message */}
      <div className="flex items-center justify-center p-8 sm:p-12 md:p-16 text-center lg:text-left">
        <div className="max-w-md w-full">
          {/* Mobile Logo Only */}
          <div className="lg:hidden flex justify-center mb-12">
            <Image 
              src="/code-campus-logo-bw.svg" 
              alt="CodeCampus" 
              width={64} 
              height={64} 
              className="w-16 h-16"
            />
          </div>

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{dict.dashboard.login.check_email}</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              {dict.dashboard.login.check_email_desc}
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-brand-blue/5 border border-brand-blue/10 rounded-xl">
              <p className="text-sm font-medium text-brand-blue mb-2">{dict.dashboard.login.security_protocol}</p>
              <p className="text-sm text-gray-600 leading-relaxed italic">
                &quot;{dict.dashboard.login.spam_notice}&quot;
              </p>
            </div>

            <Link 
              href="/login" 
              className="inline-block text-sm font-medium text-gray-400 hover:text-brand-blue transition-colors"
            >
              ← {dict.dashboard.login.back_to_auth}
            </Link>
          </div>

          <div className="mt-12">
            <p className="text-xs text-slate-400 leading-relaxed">
              {dict.dashboard.login.footer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
