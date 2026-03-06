import { describe, expect, it } from "vitest";
import { getSettingsPathForSection, getSettingsSectionFromPathname } from "@/components/identity/settings-route";

describe("settings route mapping", () => {
  it("maps usage route to usage section", () => {
    expect(getSettingsSectionFromPathname("/settings/usage", "engine")).toBe("usage");
  });

  it("maps security route to identity section", () => {
    expect(getSettingsSectionFromPathname("/settings/security", "engine")).toBe("engine");
  });

  it("maps bare settings route to engine section", () => {
    expect(getSettingsSectionFromPathname("/settings", "usage")).toBe("engine");
  });

  it("returns route-backed path for usage section", () => {
    expect(getSettingsPathForSection("usage")).toBe("/settings/usage");
  });

  it("returns null for non-route-backed section", () => {
    expect(getSettingsPathForSection("course-intel")).toBeNull();
  });
});
