import { signIn } from "@/auth";
import Globe from "@/components/ui/Globe";
import Image from "next/image";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = (params.callbackUrl as string) || "/courses";

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-hidden">
      
      {/* Left Side: Immersive Branding & Globe */}
      <div className="hidden lg:flex flex-col justify-between bg-gray-950 p-16 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none">
          <div className="text-[10rem] font-black italic tracking-tighter">0xFC</div>
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <Image 
              src="/code-campus-logo.svg" 
              alt="CodeCampus" 
              width={48} 
              height={48} 
              className="w-12 h-12 brightness-200"
            />
            <div className="flex flex-col -space-y-1.5">
              <span className="text-2xl font-black tracking-tighter text-white uppercase">CodeCampus</span>
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.3em]">Global Network</span>
            </div>
          </Link>
        </div>

        {/* Globe Container */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
           <div className="w-[120%] h-[120%]">
             <Globe />
           </div>
        </div>

        <div className="relative z-10 max-w-md">
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-6 leading-none">
             The Central <br /> Index for <span className="text-brand-blue">CS</span>.
           </h2>
           <p className="text-gray-400 font-medium leading-relaxed">
             Access a unified database of curricula from the world&apos;s leading universities. Sync your progress and analyze your learning velocity.
           </p>
        </div>

        <div className="relative z-10">
           <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
             © 2026 CodeCampus Global Network.
           </p>
        </div>
      </div>

      {/* Right Side: Authentication Form */}
      <div className="flex items-center justify-center p-8 sm:p-12 md:p-16">
        <div className="max-w-md w-full">
          {/* Mobile Logo Only */}
          <div className="lg:hidden flex justify-center mb-12">
            <Image 
              src="/code-campus-logo.svg" 
              alt="CodeCampus" 
              width={64} 
              height={64} 
              className="w-16 h-16"
            />
          </div>

          <div className="mb-10">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-2">System Authentication</h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Connect to the academic node</p>
          </div>

          {/* Social Login Disabled
          <div className="space-y-4 mb-10">
            ...
          </div>

          <div className="relative mb-10">
            ...
          </div>
          */}

          <form
            action={async (formData) => {
              "use server";
              await signIn("credentials", { ...Object.fromEntries(formData), redirectTo: callbackUrl });
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Identity Vector (Email)</label>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="name@example.com" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm focus:border-brand-blue focus:bg-white outline-none transition-all font-mono shadow-inner" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Secure Key (Password)</label>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="••••••••" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm focus:border-brand-blue focus:bg-white outline-none transition-all font-mono shadow-inner" 
                  required 
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-brand-blue text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-xl hover:bg-blue-700 transition-all shadow-2xl shadow-brand-blue/30 active:scale-[0.98]">
              Authenticate Session
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              Protected by the CodeCampus Security Protocol. <br />
              Authorized Access Only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
