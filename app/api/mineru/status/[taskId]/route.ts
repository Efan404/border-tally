import type { NextRequest } from "next/server";

import { getMaskedMinerUTaskId } from "@/lib/mineru-security";

/**
 * MinerU API 代理 - 查询任务状态
 * 绕过浏览器 CORS 限制
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    const response = await fetch(
      `https://mineru.net/api/v1/agent/parse/${taskId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    const state = data?.data?.state;
    const hasMarkdownUrl = Boolean(data?.data?.markdown_url);

    console.info("[MinerU Proxy] Status fetched", {
      taskId: getMaskedMinerUTaskId(taskId),
      state,
      hasMarkdownUrl,
      status: response.status,
    });
    
    return Response.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("[MinerU Proxy] Status error:", error);
    return Response.json(
      { code: -1, msg: "代理请求失败", error: String(error) },
      { status: 500 }
    );
  }
}
