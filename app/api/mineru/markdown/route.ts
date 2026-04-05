import type { NextRequest } from "next/server";

const ALLOWED_MARKDOWN_HOSTS = new Set(["cdn-mineru.openxlab.org.cn"]);

/**
 * MinerU Markdown 下载代理
 * 避免浏览器直接跨域请求 MinerU CDN 时被 CORS 拦截
 */
export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");

  if (!urlParam) {
    return new Response("Missing markdown url", { status: 400 });
  }

  let markdownUrl: URL;

  try {
    markdownUrl = new URL(urlParam);
  } catch {
    return new Response("Invalid markdown url", { status: 400 });
  }

  if (
    markdownUrl.protocol !== "https:" ||
    !ALLOWED_MARKDOWN_HOSTS.has(markdownUrl.hostname)
  ) {
    return new Response("Disallowed markdown host", { status: 403 });
  }

  try {
    const response = await fetch(markdownUrl.toString(), {
      method: "GET",
    });

    if (!response.ok) {
      return new Response(`Failed to fetch markdown: HTTP ${response.status}`, {
        status: response.status,
      });
    }

    const markdown = await response.text();

    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[MinerU Proxy] Markdown error:", error);
    return new Response("Failed to fetch markdown", { status: 500 });
  }
}
