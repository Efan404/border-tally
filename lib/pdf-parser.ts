import { PDFParse } from "pdf-parse";
import { BorderRecord, ParseResult, QueryPersonInfo } from "@/types";
import {
  extractBorderRecordsFromText,
  extractPersonInfoFromText,
} from "./pdf-text-parser";

// 本地托管 worker（public/ 下的静态资源）
// 已复制到：public/pdf.worker.mjs
const PDF_WORKER_PATH = "/pdf.worker.mjs";

let workerConfigured = false;
function ensurePdfWorkerConfigured() {
  // 仅在浏览器端配置
  if (typeof window === "undefined") return;
  if (workerConfigured) return;

  // 文档要求：Web/Browser 需要显式 setWorker()
  try {
    PDFParse.setWorker(PDF_WORKER_PATH);
    workerConfigured = true;
  } catch (e) {
    // 不要在这里吞掉错误，让下面的解析阶段报出更清晰的失败原因
    console.error("[pdf-parser] Failed to set pdf worker", e);
  }
}

export async function parsePDF(file: File): Promise<ParseResult> {
  ensurePdfWorkerConfigured();

  let pdf: PDFParse | null = null;

  try {
    const buffer = await file.arrayBuffer();
    pdf = new PDFParse({ data: new Uint8Array(buffer) });

    // 使用文本解析而非表格解析，避免跨页表格导致的记录丢失问题
    // 参考: https://github.com/user/project/issues/xxx
    const textResult = await pdf.getText();
    const fullText = textResult.pages.map((p) => p.text).join("\n");

    // 使用文本解析提取记录和个人信息
    const records = extractBorderRecordsFromText(fullText);
    const personInfo = extractPersonInfoFromText(fullText);

    await pdf.destroy();
    pdf = null;

    if (records.length === 0) {
      return {
        success: false,
        records: [],
        error:
          "未检测到出入境记录，请确保上传的是从国家移民管理局下载的有效PDF文件",
      };
    }

    return {
      success: true,
      personInfo,
      records,
    };
  } catch (error) {
    // 在开发阶段把真实错误带出来，避免一律显示"文件损坏"误导排查
    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    console.error("[pdf-parser] PDF parse failed", error);

    return {
      success: false,
      records: [],
      error: `PDF解析失败：${detail}`,
    };
  } finally {
    // 防止异常路径泄漏资源
    try {
      if (pdf) await pdf.destroy();
    } catch {
      // ignore
    }
  }
}
