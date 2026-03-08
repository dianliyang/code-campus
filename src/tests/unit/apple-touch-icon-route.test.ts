import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("apple touch icon route", () => {
  test("exports a 180px PNG for iOS home screen usage", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/apple-touch-icon/route.tsx"),
      "utf8",
    );

    expect(source).toContain("width: 180");
    expect(source).toContain("height: 180");
    expect(source).toContain("new ImageResponse");
  });
});
