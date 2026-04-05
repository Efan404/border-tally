import { parsePDFWithMinerU } from "@/lib/mineru-parser";

describe("mineru markdown download", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  test("downloads markdown through the local proxy instead of the MinerU CDN", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            task_id: "task-123",
            file_url: "https://oss.example.com/upload",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            state: "done",
            markdown_url:
              "https://cdn-mineru.openxlab.org.cn/pdf/2026-04-05/example/full.md",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "# parsed markdown",
      });

    global.fetch = fetchMock as typeof fetch;
    const fileLike = {
      name: "test.pdf",
      arrayBuffer: async () =>
        Uint8Array.from([100, 117, 109, 109, 121, 45, 112, 100, 102]).buffer,
    } as File;

    const result = await parsePDFWithMinerU(fileLike);

    expect(result).toEqual({
      success: true,
      markdown: "# parsed markdown",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/mineru/markdown?url=https%3A%2F%2Fcdn-mineru.openxlab.org.cn%2Fpdf%2F2026-04-05%2Fexample%2Ffull.md"
    );
  });
});
