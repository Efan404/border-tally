const ALLOWED_MINERU_MARKDOWN_HOSTS = new Set(["cdn-mineru.openxlab.org.cn"]);
const ALLOWED_MINERU_UPLOAD_HOSTS = new Set(["mineru.oss-cn-shanghai.aliyuncs.com"]);
const ALLOWED_MINERU_UPLOAD_PATH_PREFIX = "/api-upload/extract/";

export function maskSensitiveValue(
  value: string,
  visiblePrefix: number = 6,
  visibleSuffix: number = 4,
): string {
  if (!value) {
    return "[redacted]";
  }

  if (value.length <= visiblePrefix + visibleSuffix) {
    return "[redacted]";
  }

  return `${value.slice(0, visiblePrefix)}...${value.slice(-visibleSuffix)}`;
}

export function getMaskedMinerUTaskId(taskId: string): string {
  return maskSensitiveValue(taskId);
}

export function getMaskedMarkdownPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const fileName = segments.at(-1) || "";
  const objectId = segments.at(-2) || "";

  return objectId
    ? `${maskSensitiveValue(objectId)}/${fileName}`
    : fileName || "[redacted]";
}

export function isAllowedMinerUMarkdownUrl(url: URL): boolean {
  return url.protocol === "https:" && ALLOWED_MINERU_MARKDOWN_HOSTS.has(url.hostname);
}

export function isAllowedMinerUUploadUrl(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    ALLOWED_MINERU_UPLOAD_HOSTS.has(url.hostname) &&
    url.pathname.startsWith(ALLOWED_MINERU_UPLOAD_PATH_PREFIX)
  );
}
