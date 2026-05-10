import { afterEach, describe, expect, it, vi } from "vitest";
import { extractFromResume } from "./resumeExtractApi";

const ORIGINAL_FETCH = globalThis.fetch;

describe("extractFromResume", () => {
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it("posts the file as multipart/form-data and returns parsed JSON", async () => {
    const body = {
      phone: "+91 98765 43210",
      jobTitle: "SDE",
      experienceYears: 3,
      location: "Bangalore",
      linkedin: "",
      portfolioUrl: "",
      summary: "",
    };
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    globalThis.fetch = fetchSpy as any;

    const file = new File([new Uint8Array([1, 2, 3])], "resume.pdf", { type: "application/pdf" });
    const result = await extractFromResume(file);

    expect(result).toEqual(body);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/candidates\/extract-from-resume$/);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    const sentFile = fd.get("file") as File;
    expect(sentFile.name).toBe("resume.pdf");
  });

  it("throws on non-2xx", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("nope", { status: 400 })) as any;
    const file = new File([], "x.pdf", { type: "application/pdf" });
    await expect(extractFromResume(file)).rejects.toThrow(/400/);
  });
});
