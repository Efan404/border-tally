import { PDFParse } from "pdf-parse";
import { BorderRecord, ParseResult, QueryPersonInfo } from "@/types";

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

    // 提取表格数据
    const tableResult = await pdf.getTable();
    const records = extractBorderRecords(tableResult);

    // 提取文本数据用于获取查询人信息
    const textResult = await pdf.getText();
    const personInfo = extractPersonInfo(textResult.pages[0]?.text || "");

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
    // 在开发阶段把真实错误带出来，避免一律显示“文件损坏”误导排查
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

function extractPersonInfo(text: string): QueryPersonInfo {
  const nameMatch = text.match(/查询人姓名：(\S+)/);
  const birthDateMatch = text.match(/出生日期：(\d{4}年\d{1,2}月\d{1,2}日)/);
  const idNumberMatch = text.match(/公民身份号码：(\d+\*{0,}\d+)/);
  const docNumberMatch = text.match(/证件号码：(\w+)/);

  return {
    name: nameMatch?.[1] || "未知",
    birthDate: birthDateMatch?.[1] || undefined,
    idNumber: idNumberMatch?.[1] || undefined,
    documentNumber: docNumberMatch?.[1] || "",
  };
}

function extractBorderRecords(tableResult: unknown): BorderRecord[] {
  const records: BorderRecord[] = [];

  const tr = tableResult as {
    pages: Array<{
      tables: Array<string[][]>;
    }>;
  };

  for (const page of tr.pages) {
    for (const table of page.tables) {
      // 跳过表头行
      for (let i = 1; i < table.length; i++) {
        const row = table[i];
        if (row.length >= 6) {
          records.push({
            id: row[0],
            type: row[1] as "出境" | "入境",
            date: row[2],
            documentName: row[3],
            documentNumber: row[4],
            port: row[5],
            flightNumber: row[6] || undefined,
          });
        }
      }
    }
  }

  // 保持PDF原始顺序（序号1=最新，序号N=最旧）
  return records;
}
