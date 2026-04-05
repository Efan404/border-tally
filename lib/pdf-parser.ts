import { PDFParse } from "pdf-parse";
import { BorderRecord, ParseResult, QueryPersonInfo } from "@/types";
import {
  extractBorderRecordsFromText,
  extractPersonInfoFromText,
} from "./pdf-text-parser";
import {
  parsePDFWithMinerU,
  extractRecordsFromMarkdown,
  extractPersonInfoFromMarkdown,
  crossValidateResults,
  checkMinerULimits,
} from "./mineru-parser";

// 本地托管 worker（public/ 下的静态资源）
const PDF_WORKER_PATH = "/pdf.worker.mjs";

let workerConfigured = false;
function ensurePdfWorkerConfigured() {
  if (typeof window === "undefined") return;
  if (workerConfigured) return;

  try {
    PDFParse.setWorker(PDF_WORKER_PATH);
    workerConfigured = true;
  } catch (e) {
    console.error("[pdf-parser] Failed to set pdf worker", e);
  }
}

interface ParseOptions {
  /**
   * 是否启用 MinerU 交叉验证
   * - true: 同时使用本地解析和 MinerU API，交叉验证结果
   * - false: 仅使用本地解析（更快，无需网络）
   */
  enableCrossValidation?: boolean;
  /**
   * MinerU 解析超时时间（毫秒）
   * 默认: 120000 (2分钟)
   */
  mineruTimeout?: number;
}

/**
 * 解析 PDF 文件
 * 支持本地解析和 MinerU API 交叉验证两种模式
 */
export async function parsePDF(
  file: File,
  options: ParseOptions = {},
): Promise<ParseResult> {
  const { enableCrossValidation = false, mineruTimeout = 120000 } = options;

  // 步骤1：本地解析
  const localResult = await parsePDFLocally(file);

  // 如果本地解析失败，直接返回错误
  if (!localResult.success) {
    return localResult;
  }

  // 如果不需要交叉验证，直接返回本地结果
  if (!enableCrossValidation) {
    return localResult;
  }

  // 步骤2：MinerU 交叉验证
  // 检查文件是否符合 MinerU 限制
  const mineruCheck = checkMinerULimits(file);
  if (!mineruCheck.valid) {
    console.warn("[pdf-parser] MinerU validation skipped:", mineruCheck.error);
    return {
      ...localResult,
      warning: `MinerU 交叉验证跳过: ${mineruCheck.error}`,
    };
  }

  try {
    const mineruResult = await parsePDFWithMinerU(file, {
      language: "ch",
      enableTable: true,
      isOcr: false,
      enableFormula: false,
    });

    if (!mineruResult.success || !mineruResult.markdown) {
      console.warn("[pdf-parser] MinerU parse failed:", mineruResult.error);
      return {
        ...localResult,
        warning: `MinerU 解析失败: ${mineruResult.error}`,
      };
    }

    // 从 MinerU 结果中提取记录
    const mineruRecords = extractRecordsFromMarkdown(mineruResult.markdown);
    const mineruPersonInfo = extractPersonInfoFromMarkdown(
      mineruResult.markdown,
    );

    // 交叉验证
    const validation = crossValidateResults(
      localResult.records,
      mineruRecords,
    );

    // 根据验证结果决定最终返回
    if (validation.consistent) {
      // 结果一致，优先使用本地结果（更快）
      return {
        ...localResult,
        meta: {
          validationStatus: "consistent",
          localRecordCount: localResult.records.length,
          mineruRecordCount: mineruRecords.length,
        },
      };
    }

    // 结果不一致，根据推荐策略处理
    let finalRecords = localResult.records;
    let finalPersonInfo = localResult.personInfo;
    let warning: string | undefined;

    switch (validation.recommendation) {
      case "mineru":
        // MinerU 解析出更多记录，使用 MinerU 结果
        finalRecords = mineruRecords;
        finalPersonInfo = mineruPersonInfo;
        warning = `MinerU 解析出更多记录(${mineruRecords.length} vs ${localResult.records.length})，已采用 MinerU 结果`;
        break;

      case "manual":
        // 两者都有对方没有的数据，需要人工确认
        warning = `解析结果不一致：本地${localResult.records.length}条，MinerU${mineruRecords.length}条。本地独有: [${validation.localOnly.map((r) => r.id).join(", ")}], MinerU独有: [${validation.mineruOnly.map((r) => r.id).join(", ")}]`;
        break;

      case "local":
      default:
        // 默认使用本地结果
        warning = `解析结果差异：MinerU缺少${validation.mineruOnly.length}条记录，已使用本地结果`;
        break;
    }

    return {
      success: true,
      personInfo: finalPersonInfo,
      records: finalRecords,
      warning,
      meta: {
        validationStatus: "inconsistent",
        localRecordCount: localResult.records.length,
        mineruRecordCount: mineruRecords.length,
        localOnlyIds: validation.localOnly.map((r) => r.id),
        mineruOnlyIds: validation.mineruOnly.map((r) => r.id),
        recommendation: validation.recommendation,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[pdf-parser] Cross validation error:", error);
    return {
      ...localResult,
      warning: `交叉验证异常: ${errorMsg}`,
    };
  }
}

/**
 * 本地 PDF 解析
 */
async function parsePDFLocally(file: File): Promise<ParseResult> {
  ensurePdfWorkerConfigured();

  let pdf: PDFParse | null = null;

  try {
    const buffer = await file.arrayBuffer();
    pdf = new PDFParse({ data: new Uint8Array(buffer) });

    // 使用文本解析而非表格解析，避免跨页表格导致的记录丢失问题
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
    try {
      if (pdf) await pdf.destroy();
    } catch {
      // ignore
    }
  }
}
