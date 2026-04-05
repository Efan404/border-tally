/**
 * MinerU Agent 轻量解析 API 封装
 * 用于与本地 PDF 解析结果进行交叉验证
 * 文档: https://mineru.net/
 */

import { BorderRecord, QueryPersonInfo } from "@/types";

const MINERU_BASE_URL = "https://mineru.net/api/v1/agent";

interface MinerUParseOptions {
  language?: string;
  enableTable?: boolean;
  isOcr?: boolean;
  enableFormula?: boolean;
}

interface MinerUTaskResult {
  success: boolean;
  markdown?: string;
  error?: string;
}

/**
 * 使用 MinerU API 解析 PDF 文件
 * 流程：1. 获取签名上传URL -> 2. PUT上传文件 -> 3. 轮询查询结果
 */
export async function parsePDFWithMinerU(
  file: File,
  options: MinerUParseOptions = {},
): Promise<MinerUTaskResult> {
  const {
    language = "ch",
    enableTable = true,
    isOcr = false,
    enableFormula = false,
  } = options;

  try {
    // 步骤1：获取签名上传 URL
    const uploadInfo = await getUploadUrl(file.name, {
      language,
      enableTable,
      isOcr,
      enableFormula,
    });

    if (!uploadInfo.success) {
      return { success: false, error: uploadInfo.error };
    }

    // 步骤2：PUT 上传文件
    const uploadSuccess = await uploadFileToOSS(
      file,
      uploadInfo.fileUrl!,
    );

    if (!uploadSuccess) {
      return { success: false, error: "文件上传到 OSS 失败" };
    }

    // 步骤3：轮询查询结果
    const result = await pollTaskResult(uploadInfo.taskId!);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `MinerU 解析失败: ${errorMsg}` };
  }
}

/**
 * 获取签名上传 URL
 */
async function getUploadUrl(
  fileName: string,
  options: Required<MinerUParseOptions>,
): Promise<{ success: boolean; taskId?: string; fileUrl?: string; error?: string }> {
  const response = await fetch(`${MINERU_BASE_URL}/parse/file`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: fileName,
      language: options.language,
      enable_table: options.enableTable,
      is_ocr: options.isOcr,
      enable_formula: options.enableFormula,
    }),
  });

  if (!response.ok) {
    // 处理限流错误
    if (response.status === 429) {
      return { success: false, error: "请求过于频繁，请稍后再试（IP限流）" };
    }
    return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
  }

  const result = await response.json();

  if (result.code !== 0) {
    return { success: false, error: result.msg || "获取上传链接失败" };
  }

  return {
    success: true,
    taskId: result.data.task_id,
    fileUrl: result.data.file_url,
  };
}

/**
 * PUT 上传文件到 OSS
 */
async function uploadFileToOSS(file: File, uploadUrl: string): Promise<boolean> {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/pdf",
      },
    });

    return response.status === 200 || response.status === 201;
  } catch (error) {
    console.error("[mineru-parser] Upload to OSS failed:", error);
    return false;
  }
}

/**
 * 轮询查询任务结果
 */
async function pollTaskResult(
  taskId: string,
  timeout: number = 120000, // 默认2分钟超时
  interval: number = 3000, // 每3秒轮询一次
): Promise<MinerUTaskResult> {
  const startTime = Date.now();

  const stateLabels: Record<string, string> = {
    uploading: "文件下载中",
    pending: "排队中",
    running: "解析中",
    "waiting-file": "等待文件上传",
  };

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${MINERU_BASE_URL}/parse/${taskId}`);

      if (!response.ok) {
        await sleep(interval);
        continue;
      }

      const result = await response.json();

      if (result.code !== 0) {
        return { success: false, error: result.msg || "查询任务状态失败" };
      }

      const { state, markdown_url, err_msg, err_code } = result.data;

      switch (state) {
        case "done":
          // 下载 Markdown 内容
          if (markdown_url) {
            const markdownContent = await fetchMarkdownContent(markdown_url);
            return { success: true, markdown: markdownContent };
          }
          return { success: false, error: "解析完成但未返回 Markdown 链接" };

        case "failed":
          return {
            success: false,
            error: `解析失败[${err_code}]: ${err_msg || "未知错误"}`,
          };

        default:
          // 继续轮询
          console.log(`[mineru-parser] ${stateLabels[state] || state}...`);
          await sleep(interval);
          break;
      }
    } catch (error) {
      console.error("[mineru-parser] Polling error:", error);
      await sleep(interval);
    }
  }

  return { success: false, error: `轮询超时 (${timeout / 1000}s)，任务可能仍在处理中` };
}

/**
 * 获取 Markdown 内容
 */
async function fetchMarkdownContent(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载 Markdown 失败: HTTP ${response.status}`);
  }
  return response.text();
}

/**
 * 从 MinerU 返回的 Markdown 中提取出入境记录
 */
export function extractRecordsFromMarkdown(markdown: string): BorderRecord[] {
  const records: BorderRecord[] = [];
  const lines = markdown.split("\n").map((l) => l.trim()).filter(Boolean);

  // 尝试匹配表格格式
  // MinerU 会将 PDF 表格转为 Markdown 表格格式
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 匹配表格行（单行格式）
    // | 序号 | 类型 | 日期 | 证件名 | 证件号 | 口岸 |
    const tableMatch = line.match(
      /^\|\s*(\d+)\s*\|\s*(出境|入境)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/,
    );

    if (tableMatch) {
      const [, id, type, date, documentName, documentNumber, port] = tableMatch;
      records.push({
        id: id.trim(),
        type: type.trim() as "出境" | "入境",
        date: date.trim(),
        documentName: documentName.trim(),
        documentNumber: documentNumber.trim(),
        port: port.trim(),
      });
      continue;
    }

    // 匹配纯文本格式（多行格式在 Markdown 中）
    // 1. 纯数字行 + 类型行 + 日期行...
    if (/^\d+$/.test(line) && i + 5 < lines.length) {
      const id = line;
      const typeLine = lines[i + 1];
      const dateLine = lines[i + 2];
      const docNameLine = lines[i + 3];
      const docNumLine = lines[i + 4];
      const portLine = lines[i + 5];

      if (
        /^(出境|入境)$/.test(typeLine) &&
        /^\d{4}-\d{2}-\d{2}$/.test(dateLine) &&
        docNameLine &&
        docNumLine &&
        portLine
      ) {
        records.push({
          id,
          type: typeLine as "出境" | "入境",
          date: dateLine,
          documentName: docNameLine,
          documentNumber: docNumLine,
          port: portLine,
        });
        i += 5; // 跳过已处理的行
      }
    }
  }

  // 按序号排序
  records.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

  return records;
}

/**
 * 从 Markdown 中提取个人信息
 */
export function extractPersonInfoFromMarkdown(markdown: string): QueryPersonInfo {
  const nameMatch = markdown.match(/查询人姓名[：:]\s*(\S+)/);
  const genderMatch = markdown.match(/性别[：:]\s*(.)/);
  const birthDateMatch = markdown.match(/出生日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)/);
  const idNumberMatch = markdown.match(/公民身份号码[：:]\s*([\d*]+)/);

  // 尝试从表格中提取证件号
  const firstRecordMatch = markdown.match(
    /\|\s*\d+\s*\|\s*(?:出境|入境)\s*\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*[^|]+\|\s*([^|]+)\|/,
  );

  return {
    name: nameMatch?.[1] || "未知",
    gender: genderMatch?.[1],
    birthDate: birthDateMatch?.[1],
    idNumber: idNumberMatch?.[1],
    documentNumber: firstRecordMatch?.[1]?.trim() || "",
  };
}

/**
 * 交叉验证本地解析和 MinerU 解析结果
 * 返回验证结果和建议
 */
export function crossValidateResults(
  localRecords: BorderRecord[],
  mineruRecords: BorderRecord[],
): {
  consistent: boolean;
  localOnly: BorderRecord[];
  mineruOnly: BorderRecord[];
  common: BorderRecord[];
  recommendation: "local" | "mineru" | "manual";
} {
  const localIds = new Set(localRecords.map((r) => r.id));
  const mineruIds = new Set(mineruRecords.map((r) => r.id));

  const commonIds = new Set([...localIds].filter((id) => mineruIds.has(id)));
  const localOnlyIds = new Set([...localIds].filter((id) => !mineruIds.has(id)));
  const mineruOnlyIds = new Set([...mineruIds].filter((id) => !localIds.has(id)));

  const common = localRecords.filter((r) => commonIds.has(r.id));
  const localOnly = localRecords.filter((r) => localOnlyIds.has(r.id));
  const mineruOnly = mineruRecords.filter((r) => mineruOnlyIds.has(r.id));

  // 判断一致性
  const consistent = localOnly.length === 0 && mineruOnly.length === 0;

  // 推荐策略
  let recommendation: "local" | "mineru" | "manual" = "local";

  if (consistent) {
    // 完全一致，优先使用本地（更快）
    recommendation = "local";
  } else if (mineruOnly.length > localOnly.length) {
    // MinerU 解析出更多记录，可能更准确
    recommendation = "mineru";
  } else if (localOnly.length > 0 && mineruOnly.length > 0) {
    // 两者都有对方没有的数据，需要人工确认
    recommendation = "manual";
  }

  return {
    consistent,
    localOnly,
    mineruOnly,
    common,
    recommendation,
  };
}

/**
 * 辅助函数：延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 检查文件是否符合 MinerU 限制
 */
export function checkMinerULimits(file: File): { valid: boolean; error?: string } {
  // 文件大小限制: 10MB
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `文件大小 ${(file.size / 1024 / 1024).toFixed(2)}MB 超过限制 10MB`,
    };
  }

  // 文件类型限制
  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
  ];

  if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf")) {
    return {
      valid: false,
      error: `不支持的文件类型: ${file.type}，仅支持 PDF 和图片`,
    };
  }

  return { valid: true };
}
