import Navbar from "@/components/layout/Navbar";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);

  return (
    <>
      <Navbar dict={dict.navbar} />
      {children}
    </>
  );
}
