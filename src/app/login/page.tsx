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
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#fafaf9] text-[#1c1917]"
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 [background-image:linear-gradient(to_right,rgba(41,37,36,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(41,37,36,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />

      <nav className="relative z-30 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-3 text-2xl tracking-tight text-stone-900"
          style={{ fontFamily: "var(--font-landing-serif)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/athena.svg" alt="Athena logo" width={24} height={24} />
          Athena
        </Link>

        <Link
          href="/"
          className="border border-stone-900 px-4 py-2 text-xs uppercase tracking-widest text-stone-900 transition hover:bg-stone-900 hover:text-white"
          style={{ fontFamily: "var(--font-landing-mono)" }}
        >
          Back Home
        </Link>
      </nav>

      <main className="relative z-20 mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-8 px-6 pb-12 pt-4 lg:grid-cols-2 lg:gap-10 lg:pt-8">
        <section className="relative overflow-hidden border border-stone-200 bg-stone-900 p-8 text-stone-100">
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 border border-stone-700 bg-stone-800/80 px-3 py-1 text-[10px] uppercase tracking-widest text-stone-300" style={{ fontFamily: "var(--font-landing-mono)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-stone-200" />
              Authentication Node
            </div>
            <h1 className="text-5xl leading-[1.05] tracking-tight md:text-6xl" style={{ fontFamily: "var(--font-landing-serif)" }}>
              Access your
              <br />
              <span className="text-stone-300">Athena workspace.</span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-stone-300">
              {dict.hero.description}
            </p>
            <div className="space-y-2 border-t border-stone-700 pt-4 text-[10px] uppercase tracking-widest text-stone-400" style={{ fontFamily: "var(--font-landing-mono)" }}>
              <p>Magic-link sign in only</p>
              <p>No password required</p>
              <p>{dict.navbar.global_network}</p>
            </div>
          </div>
        </section>

        <section className="flex items-stretch">
          <div className="flex w-full flex-col overflow-hidden border border-stone-200 bg-white">
            <div className="flex h-10 items-center justify-between border-b border-stone-200 bg-stone-50 px-4">
              <div className="flex gap-2">
                <span className="h-2.5 w-2.5 rounded-full border border-stone-300 bg-stone-200" />
                <span className="h-2.5 w-2.5 rounded-full border border-stone-300 bg-stone-200" />
                <span className="h-2.5 w-2.5 rounded-full border border-stone-300 bg-stone-200" />
              </div>
              <div className="text-[10px] uppercase tracking-widest text-stone-400" style={{ fontFamily: "var(--font-landing-mono)" }}>
                Session / Login
              </div>
              <span className="text-[10px] uppercase tracking-widest text-stone-400" style={{ fontFamily: "var(--font-landing-mono)" }}>
                {sent ? "Email Sent" : "Ready"}
              </span>
            </div>
            <div className="p-4 sm:p-6">
              <LoginForm
                onMagicLink={handleMagicLink}
                sent={sent}
                dict={dict.dashboard.login}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-20 mx-auto w-full max-w-[1200px] px-6 pb-8">
        <p className="text-[10px] uppercase tracking-widest text-stone-400" style={{ fontFamily: "var(--font-landing-mono)" }}>
          {dict.footer.copyright}
        </p>
      </footer>
    </div>
  );
}
