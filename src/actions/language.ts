"use server";

import { cookies } from "next/headers";
import { i18n, Locale } from "@/lib/i18n";

export async function setLanguage(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, { path: "/", maxAge: 31536000 });
}

export async function getLanguage(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined;
  
  if (locale && i18n.locales.includes(locale)) {
    return locale;
  }
  
  return i18n.defaultLocale;
}
