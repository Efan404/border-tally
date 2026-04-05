/** @jest-environment node */

import { GET } from "@/app/api/mineru/status/[taskId]/route";

describe("mineru status route", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  test("uses taskId from async route params", async () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const fetchSpy = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          msg: "ok",
          data: {
            state: "done",
            markdown_url: "https://cdn-mineru.openxlab.org.cn/pdf/2026-04-05/example/full.md",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );
    global.fetch = fetchSpy as typeof fetch;
    const taskId = "b23b9fe9-57ab-4a19-99ce-5f35df46363e12";

    const response = await GET(new Request(`http://localhost/api/mineru/status/${taskId}`), {
      params: Promise.resolve({ taskId }),
    } as never);

    expect(fetchSpy).toHaveBeenCalledWith(
      `https://mineru.net/api/v1/agent/parse/${taskId}`,
      expect.objectContaining({
        method: "GET",
      })
    );
    await expect(response.json()).resolves.toEqual({
      code: 0,
      msg: "ok",
      data: {
        state: "done",
        markdown_url: "https://cdn-mineru.openxlab.org.cn/pdf/2026-04-05/example/full.md",
      },
    });
    expect(infoSpy).toHaveBeenCalledWith(
      "[MinerU Proxy] Status fetched",
      expect.objectContaining({
        taskId: expect.not.stringContaining(taskId),
      })
    );
  });
});
