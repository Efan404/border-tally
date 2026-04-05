/**
 * MinerU API 代理 - 获取上传 URL
 * 绕过浏览器 CORS 限制
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const response = await fetch("https://mineru.net/api/v1/agent/parse/file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return Response.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("[MinerU Proxy] Upload error:", error);
    return Response.json(
      { code: -1, msg: "代理请求失败", error: String(error) },
      { status: 500 }
    );
  }
}
