import { afterEach, describe, expect, test, vi } from "vitest";

const loadCacheModule = async () => {
  const modulePath = "@/lib/scrapers/cau-blob-cache";
  return import(modulePath);
};

describe("CAU blob cache helper contract", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@vercel/blob");
    vi.restoreAllMocks();
    delete process.env.CAU_BLOB_ACCESS;
  });

  test("builds semester and ModulDB cache keys", async () => {
    const cacheModule = await loadCacheModule();

    expect(cacheModule.semesterXmlKey("2026s")).toBe("cau/xml/2026s.xml");
    expect(cacheModule.modulDbXmlKey("infGAI-01a")).toBe("cau/moduldb/infGAI-01a.xml");
  });

  test("treats blob read failures as cache misses", async () => {
    vi.doMock("@vercel/blob", () => ({
      get: vi.fn().mockRejectedValue(new Error("missing")),
      put: vi.fn(),
    }));

    const cacheModule = await loadCacheModule();

    await expect(cacheModule.readCachedText("cau/xml/2026s.xml")).resolves.toBeNull();
  });

  test("writes exact raw payloads back to blob storage", async () => {
    const putMock = vi.fn().mockResolvedValue({ url: "https://blob.example/cau/xml/2026s.xml" });
    vi.doMock("@vercel/blob", () => ({
      put: putMock,
      get: vi.fn(),
    }));

    const cacheModule = await loadCacheModule();

    await cacheModule.writeCachedText("cau/xml/2026s.xml", "<Lecture />");

    expect(putMock).toHaveBeenCalledWith("cau/xml/2026s.xml", "<Lecture />", expect.any(Object));
  });

  test("retries writes with private access when the store rejects public access", async () => {
    const putMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Cannot use public access on a private store"))
      .mockResolvedValueOnce({ url: "https://blob.example/cau/xml/2026s.xml" });
    vi.doMock("@vercel/blob", () => ({
      put: putMock,
      get: vi.fn(),
    }));

    const cacheModule = await loadCacheModule();

    await cacheModule.writeCachedText("cau/xml/2026s.xml", "<Lecture />");

    expect(putMock).toHaveBeenNthCalledWith(
      1,
      "cau/xml/2026s.xml",
      "<Lecture />",
      expect.objectContaining({ access: "public" }),
    );
    expect(putMock).toHaveBeenNthCalledWith(
      2,
      "cau/xml/2026s.xml",
      "<Lecture />",
      expect.objectContaining({ access: "private" }),
    );
  });

  test("reads cached text through blob get with private fallback", async () => {
    const getMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("public access failed"))
      .mockResolvedValueOnce({
        statusCode: 200,
        stream: new Response("<Lecture />").body,
      });
    vi.doMock("@vercel/blob", () => ({
      get: getMock,
      put: vi.fn(),
    }));

    const cacheModule = await loadCacheModule();

    await expect(cacheModule.readCachedText("cau/xml/2026s.xml")).resolves.toBe("<Lecture />");
    expect(getMock).toHaveBeenNthCalledWith(1, "cau/xml/2026s.xml", { access: "public" });
    expect(getMock).toHaveBeenNthCalledWith(2, "cau/xml/2026s.xml", { access: "private" });
  });
});
