import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import ImportForm from "@/components/import/ImportForm";

export default async function ImportPage() {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);

  return <ImportForm dict={dict.dashboard.import} />;
}
