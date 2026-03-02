import { renderSettingsPage } from "./_shared";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return renderSettingsPage("engine");
}
