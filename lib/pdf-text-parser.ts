import { BorderRecord, QueryPersonInfo } from "@/types";

/**
 * 从 PDF 文本中提取出入境记录
 * 使用文本解析而非表格解析，避免跨页表格导致的记录丢失问题
 */
export function extractBorderRecordsFromText(text: string): BorderRecord[] {
  const records: BorderRecord[] = [];
  const lines = text.split("\n");

  // 用于处理跨行口岸名称的缓冲区
  let pendingLine: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行和表头行
    if (!line || isHeaderLine(line)) {
      // 如果之前有挂起的行，尝试处理它
      if (pendingLine) {
        const record = tryParseRecord(pendingLine);
        if (record) {
          records.push(record);
        }
        pendingLine = null;
      }
      continue;
    }

    // 尝试解析为记录行
    if (isRecordLine(line)) {
      // 如果之前有挂起的行，先处理它
      if (pendingLine) {
        const record = tryParseRecord(pendingLine);
        if (record) {
          records.push(record);
        }
      }
      pendingLine = line;
    } else if (pendingLine && isPortContinuation(line)) {
      // 可能是前一行的口岸名称续行
      pendingLine += line;
    } else if (pendingLine) {
      // 不是续行，处理挂起的行
      const record = tryParseRecord(pendingLine);
      if (record) {
        records.push(record);
      }
      // 检查当前行是否是新的记录行
      if (isRecordLine(line)) {
        pendingLine = line;
      } else {
        pendingLine = null;
      }
    }
  }

  // 处理最后挂起的行
  if (pendingLine) {
    const record = tryParseRecord(pendingLine);
    if (record) {
      records.push(record);
    }
  }

  // 按序号排序（确保顺序正确）
  records.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

  return records;
}

/**
 * 尝试解析记录行
 */
function tryParseRecord(line: string): BorderRecord | null {
  // 标准化空白字符
  const normalizedLine = line.trim().replace(/\s+/g, " ");
  return parseRecordLine(normalizedLine);
}

/**
 * 判断是否为口岸名称的续行
 * 通常是单行短文本，不包含完整记录的特征
 */
function isPortContinuation(line: string): boolean {
  // 如果这一行是简单的文本（如"岸"），可能是口岸名称的续行
  const trimmed = line.trim();
  // 续行通常很短（1-3个字符），且不包含数字、日期等记录特征
  if (trimmed.length > 0 && trimmed.length <= 4) {
    // 检查是否只包含中文字符（口岸名称的一部分）
    return /^[\u4e00-\u9fa5]+$/.test(trimmed);
  }
  return false;
}

/**
 * 从 PDF 文本中提取查询人信息
 */
export function extractPersonInfoFromText(text: string): QueryPersonInfo {
  const nameMatch = text.match(/查询人姓名[：:]\s*(\S+)/);
  const genderMatch = text.match(/性别[：:]\s*(.)/);
  const birthDateMatch = text.match(/出生日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)/);
  const idNumberMatch = text.match(/公民身份号码[：:]\s*([\d*]+)/);

  // 尝试从第一条记录获取证件号码
  const firstRecordMatch = text.match(
    /\d+\s+(?:出境|入境)\s+\d{4}-\d{2}-\d{2}\s+\S+\s+(\w+)\s+/,
  );

  return {
    name: nameMatch?.[1] || "未知",
    gender: genderMatch?.[1],
    birthDate: birthDateMatch?.[1],
    idNumber: idNumberMatch?.[1],
    documentNumber: firstRecordMatch?.[1] || "",
  };
}

/**
 * 判断是否为表头行
 */
function isHeaderLine(line: string): boolean {
  // 匹配表头关键词
  const headerPatterns = [
    /^序号\s+出境\/入境/,
    /^(?:出境\/入境|出入境日期|证件名称|证件号码|出入境口岸)$/,
    /^第\s+\d+\s+页/,
    /^国家移民管理局/,
    /^出入境记录查询结果/,
    /^编号[：:]/,
    /^查询日期[：:]/,
    /^查询人/,
    /^公民身份号码/,
    /^其本人在/,
    /年期间有下列出入境记录/,
    /^\d+\.本电子文件/,
    /^制作日期[：:]/,
  ];

  return headerPatterns.some((pattern) => pattern.test(line));
}

/**
 * 判断是否为记录行
 * 格式：序号 出境/入境 日期 证件名 证件号 口岸 [航班号]
 */
export function isRecordLine(line: string): boolean {
  // 必须匹配的记录行模式
  // 序号(数字) + 类型(出境/入境) + 日期(YYYY-MM-DD) + 证件名 + 证件号 + 口岸
  const recordPattern =
    /^\d+\s+(出境|入境)\s+\d{4}-\d{2}-\d{2}\s+\S+\s+\S+\s+\S+/;

  // 排除表头误判
  if (line.includes("出境/入境") && line.includes("出入境日期")) {
    return false;
  }

  return recordPattern.test(line);
}

/**
 * 解析单条记录行
 */
export function parseRecordLine(line: string): BorderRecord | null {
  // 标准化空白字符
  const normalizedLine = line.trim().replace(/\s+/g, " ");
  
  // 解析各字段
  // 格式: 序号 类型 日期 证件名 证件号 口岸 [航班号]
  const match = normalizedLine.match(
    /^(\d+)\s+(出境|入境)\s+(\d{4}-\d{2}-\d{2})\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\S+))?$/,
  );

  if (!match) {
    return null;
  }

  const [, id, type, date, documentName, documentNumber, port, flightNumber] =
    match;

  return {
    id,
    type: type as "出境" | "入境",
    date,
    documentName,
    documentNumber,
    port,
    flightNumber: flightNumber || undefined,
  };
}
