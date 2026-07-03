import { describe, expect, it } from "vitest";
import { validateUpload } from "../../src/server/services/files";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "../../src/server/validation/files";

describe("file upload validation", () => {
  it("accepts an allowed mime type within the size limit", () => {
    expect(() => validateUpload({ mimeType: "application/pdf", sizeBytes: 1024 })).not.toThrow();
  });

  it("rejects a disallowed mime type", () => {
    expect(() => validateUpload({ mimeType: "application/x-msdownload", sizeBytes: 1024 })).toThrow();
  });

  it("rejects a file over the maximum size", () => {
    expect(() => validateUpload({ mimeType: "application/pdf", sizeBytes: MAX_UPLOAD_BYTES + 1 })).toThrow();
  });

  it("rejects an empty file", () => {
    expect(() => validateUpload({ mimeType: "application/pdf", sizeBytes: 0 })).toThrow();
  });

  it("exposes the expected allow-list", () => {
    expect(ALLOWED_MIME_TYPES.has("image/png")).toBe(true);
    // Widened for task/assignment deliverables (Round 4) — still a
    // whitelist, just covering common student/TA work formats now.
    expect(ALLOWED_MIME_TYPES.has("application/zip")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("application/x-msdownload")).toBe(false);
  });
});
