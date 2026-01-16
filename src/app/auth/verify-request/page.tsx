import Image from "next/image";
import Link from "next/link";
import Globe from "@/components/ui/Globe";

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-hidden">
      {/* Left Side: Immersive Branding & Globe */}
      <div className="hidden lg:flex flex-col justify-between bg-gray-950 p-16 relative overflow-hidden">
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
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.3em]">Open Catalog</span>
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
             Verification <br /> In <span className="text-brand-blue">Progress</span>.
           </h2>
           <p className="text-gray-400 font-medium leading-relaxed">
             A secure access link has been dispatched to your identity vector. Please verify your inbox to establish a session.
           </p>
        </div>

        <div className="relative z-10">
           <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
             © 2026 CodeCampus Catalog.
           </p>
        </div>
      </div>

      {/* Right Side: Message */}
      <div className="flex items-center justify-center p-8 sm:p-12 md:p-16 text-center lg:text-left">
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
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-2">Check your email</h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
              A magic link has been sent to your email address. 
              Click the link in the email to sign in instantly.
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-brand-blue/5 border border-brand-blue/10 rounded-xl">
              <p className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-2">Security Protocol</p>
              <p className="text-sm text-gray-600 leading-relaxed italic">
                &quot;If you don&apos;t see the email, please check your spam folder or request a new link.&quot;
              </p>
            </div>

            <Link 
              href="/login" 
              className="inline-block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-brand-blue transition-colors"
            >
              ← Back to Authentication
            </Link>
          </div>

          <div className="mt-12">
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
