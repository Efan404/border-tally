/** @jest-environment node */

import { GET } from "@/app/api/mineru/status/[taskId]/route";

describe("mineru status route", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  test("uses taskId from async route params", async () => {
    const fetchSpy = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, msg: "ok" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
    global.fetch = fetchSpy as typeof fetch;

    const response = await GET(new Request("http://localhost/api/mineru/status/task-123"), {
      params: Promise.resolve({ taskId: "task-123" }),
    } as never);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://mineru.net/api/v1/agent/parse/task-123",
      expect.objectContaining({
        method: "GET",
      })
    );
    await expect(response.json()).resolves.toEqual({ code: 0, msg: "ok" });
  });
});
