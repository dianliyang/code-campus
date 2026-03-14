import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("SecurityIdentitySection layout", () => {
  test("removes nested bordered wrappers from identity and danger zone cards", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/identity/SecurityIdentitySection.tsx"),
      "utf8",
    );

    expect(source).not.toContain("p-3 rounded-lg border bg-slate-50/50");
    expect(source).not.toContain("border border-emerald-100 bg-emerald-50/30");
    expect(source).not.toContain("md:border-l");
    expect(source).not.toContain("border border-rose-100 bg-rose-50/30");
  });
});
