import OrbitingCircles from "@/components/home/OrbitingCircles";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import { createClient, getBaseUrl } from "@/lib/supabase/server";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const lang = await getLanguage();
  const dict = await getDictionary(lang);
  const sent = params.sent === "true";

  async function handleMagicLink(formData: FormData) {
    "use server";
    try {
      const email = formData.get("email") as string;
      const baseUrl = await getBaseUrl();
      console.log(
        `[Login] Attempting Supabase Magic Link for ${email} with redirect to ${baseUrl}`
      );

      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback`,
        },
      });
      if (error) throw error;

      console.log("[Login] Supabase Magic Link dispatched");

      return { success: true };
    } catch (error) {
      console.error("[Login] Supabase Magic Link dispatch error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { error: errorMessage };
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-hidden">
      {/* Left Side: Immersive Branding & Data Visualization */}
      <div className="hidden lg:flex flex-col justify-between bg-gray-950 p-16 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none">
          <div className="text-[10rem] font-black italic tracking-tighter">
            0xFC
          </div>
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <Image
              src="/code-campus-logo.svg"
              alt="CodeCampus"
              width={48}
              height={48}
              priority
              className="w-12 h-12 brightness-200"
            />
            <div className="flex flex-col -space-y-1.5">
              <span className="text-2xl font-black tracking-tighter text-white uppercase">
                CodeCampus
              </span>
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.3em]">
                {dict.navbar.global_network}
              </span>
            </div>
          </Link>
        </div>

        {/* Visualization Container */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <div className="w-[120%] h-[120%]">
            <OrbitingCircles />
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-6 leading-none">
            {dict.dashboard.login.title.split(" ")[0]} <br />{" "}
            {dict.dashboard.login.title.split(" ").slice(1).join(" ")}{" "}
            <span className="text-brand-blue">CS</span>.
          </h2>
          <p className="text-gray-400 font-medium leading-relaxed">
            {dict.hero.description}
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
            {dict.footer.copyright}
          </p>
        </div>
      </div>

      {/* Right Side: Authentication Form */}
      <div className="flex items-center justify-center p-8 sm:p-12 md:p-16">
        <div className="w-full flex justify-center lg:block">
          {/* Mobile Logo Only */}
          <div className="lg:hidden flex justify-center mb-12">
            <Image
              src="/code-campus-logo.svg"
              alt="CodeCampus"
              width={64}
              height={64}
              priority
              className="w-16 h-16"
            />
          </div>

          <LoginForm
            onMagicLink={handleMagicLink}
            sent={sent}
            dict={dict.dashboard.login}
          />
        </div>
      </div>
    </div>
  );
}
