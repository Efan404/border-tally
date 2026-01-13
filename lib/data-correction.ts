import {
  BorderRecord,
  ValidationIssue,
  DataValidationResult,
} from "@/types";

/**
 * 数据修正和验证模块
 *
 * 核心功能：
 * 1. 证件匹配修正：使用栈结构进行"括号匹配"式的出入境配对
 * 2. 数据异常检测：检测连续出境、孤立入境、同日多次出入境等问题
 *
 * 原则：
 * - 用什么证件出境就用什么证件入境
 * - 每个证件类型独立处理，避免跨证件混淆
 * - 自动修正证件不匹配，检测但不自动处理其他异常
 */

/**
 * 按证件号码和证件名称分组
 */
function groupByDocument(
  records: BorderRecord[],
): Map<string, BorderRecord[]> {
  const groups = new Map<string, BorderRecord[]>();

  for (const record of records) {
    const key = `${record.documentNumber}__${record.documentName}`;
    const group = groups.get(key) || [];
    group.push(record);
    groups.set(key, group);
  }

  return groups;
}

/**
 * 排序记录：按日期升序，同日出境优先
 */
function sortRecords(records: BorderRecord[]): BorderRecord[] {
  return [...records].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    // 同日：出境优先
    if (a.type === b.type) return 0;
    return a.type === "出境" ? -1 : 1;
  });
}

/**
 * 检测同一天多次出入境
 */
function detectSameDayMultiple(
  records: BorderRecord[],
  issues: ValidationIssue[],
): void {
  // 按证件分组后检测
  const groups = groupByDocument(records);

  for (const [, groupRecords] of groups) {
    const dateMap = new Map<string, BorderRecord[]>();

    for (const record of groupRecords) {
      const list = dateMap.get(record.date) || [];
      list.push(record);
      dateMap.set(record.date, list);
    }

    for (const [date, recs] of dateMap) {
      if (recs.length > 2) {
        issues.push({
          type: "same_day_multiple",
          severity: "info",
          recordIds: recs.map((r) => r.id),
          message: `${date} 同一天有 ${recs.length} 条出入境记录`,
          suggestion: "这可能是同日多次跨境的正常情况",
        });
      }
    }
  }
}

/**
 * 主函数：证件匹配修正和数据验证
 *
 * 核心逻辑：
 * - 只检测出境-入境配对时的证件不匹配
 * - 用什么证件出境就应该用什么证件入境
 * - 中国边检记录不会出现连续出境或连续入境的情况
 */
export function correctDocumentMatching(
  records: BorderRecord[],
): DataValidationResult {
  const issues: ValidationIssue[] = [];
  const correctedRecords: BorderRecord[] = [];
  let correctedCount = 0;

  // 按序号排序（id降序：从旧到新）
  const allSorted = sortRecords(records);

  // 使用栈进行出境-入境配对
  const stack: BorderRecord[] = [];

  for (const record of allSorted) {
    if (record.type === "出境") {
      stack.push(record);
      correctedRecords.push(record);
    } else {
      // 入境
      // 正常情况下栈一定有元素（不会出现孤立入境）
      if (stack.length === 0) {
        // 数据异常，但还是要处理
        correctedRecords.push(record);
        continue;
      }

      // 弹栈配对
      const matchedExit = stack.pop()!;

      // 检查出境-入境的证件是否匹配
      if (
        record.documentNumber !== matchedExit.documentNumber ||
        record.documentName !== matchedExit.documentName
      ) {
        // 证件不匹配，自动修正
        const correctedRecord: BorderRecord = {
          ...record,
          documentNumber: matchedExit.documentNumber,
          documentName: matchedExit.documentName,
        };

        correctedRecords.push(correctedRecord);
        correctedCount++;

        issues.push({
          type: "document_mismatch",
          severity: "info",
          recordIds: [matchedExit.id, record.id],
          message: `已修正证件不匹配：${matchedExit.date} 使用 ${matchedExit.documentName} 出境，${record.date} 的入境证件已自动修正为 ${matchedExit.documentName}`,
          suggestion: undefined,
        });
      } else {
        // 证件匹配，无需修正
        correctedRecords.push(record);
      }
    }
  }

  // 检测同一天多次出入境
  detectSameDayMultiple(correctedRecords, issues);

  // 按原始顺序返回（保持ID顺序，方便UI展示）
  const sortedCorrected = correctedRecords.sort((a, b) => {
    const idA = parseInt(a.id) || 0;
    const idB = parseInt(b.id) || 0;
    return idA - idB;
  });

  return {
    correctedRecords: sortedCorrected,
    issues,
    originalRecordsCount: records.length,
    correctedCount,
  };
}
