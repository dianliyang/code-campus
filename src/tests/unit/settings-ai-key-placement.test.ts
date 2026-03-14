import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("settings AI key placement", () => {
  test("keeps provider API key controls in Engine instead of API Control", () => {
    const engineSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/identity/EngineSettingsPanel.tsx"),
      "utf8",
    );
    const apiManagementSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/identity/ApiManagementCard.tsx"),
      "utf8",
    );

    expect(engineSource).toContain("Provider API Key");
    expect(engineSource).toContain("Delete API Key");
    expect(engineSource).toContain("never returned to this interface");
    expect(apiManagementSource).not.toContain("AI Infrastructure");
    expect(apiManagementSource).not.toContain("Configure your own AI API keys");
  });
});
