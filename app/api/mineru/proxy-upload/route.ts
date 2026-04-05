import { isAllowedMinerUUploadUrl } from "@/lib/mineru-security";

/**
 * MinerU OSS 上传代理
 * 绕过浏览器直接上传 OSS 的 CORS 限制
 */
export async function POST(request: Request) {
  try {
    const { fileUrl, fileData } = await request.json();
    const uploadUrl = new URL(fileUrl);

    if (!isAllowedMinerUUploadUrl(uploadUrl)) {
      return Response.json(
        { success: false, error: "Disallowed upload host" },
        { status: 403 }
      );
    }
    
    // 将 base64 转换回 blob
    const blob = Buffer.from(fileData, 'base64');
    
    // 代理上传到 OSS
    const response = await fetch(uploadUrl.toString(), {
      method: "PUT",
      body: blob,
      // 不设置 Content-Type，让请求自动处理
    });

    return Response.json({
      success: response.status === 200 || response.status === 201,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    console.error("[OSS Proxy] Upload error:", error);
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
