/** @jest-environment node */

import { POST } from "@/app/api/mineru/proxy-upload/route";

describe("mineru proxy upload route", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  test("rejects uploads to non-allowlisted hosts", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as typeof fetch;

    const response = await POST(
      new Request("http://localhost/api/mineru/proxy-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl: "https://example.com/evil-upload",
          fileData: "ZHVtbXk=",
        }),
      })
    );

    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Disallowed upload host",
    });
  });
});
