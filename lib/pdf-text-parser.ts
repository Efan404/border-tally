import { BorderRecord, QueryPersonInfo } from "@/types";

/**
 * 从 PDF 文本中提取出入境记录
 * 使用文本解析而非表格解析，避免跨页表格导致的记录丢失问题
 * 
 * 支持两种格式：
 * 1. 单行格式：序号 类型 日期 证件名 证件号 口岸 [航班号]
 * 2. 多行格式：每条记录字段分行显示
 */
export function extractBorderRecordsFromText(text: string): BorderRecord[] {
  // 首先尝试检测格式类型
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  
  // 检测是否为多行格式（字段分行显示）
  // 特征：连续的纯数字行（序号）后面跟着"出境/入境"
  const isMultiLineFormat = detectMultiLineFormat(lines);
  
  if (isMultiLineFormat) {
    return extractRecordsFromMultiLineFormat(lines);
  }
  
  return extractRecordsFromSingleLineFormat(lines);
}

/**
 * 检测是否为多行格式（每条记录字段分行显示）
 */
function detectMultiLineFormat(lines: string[]): boolean {
  // 查找符合多行格式特征的模式
  // 例如：纯数字行（序号）后紧跟"入境"或"出境"
  let sequentialMatches = 0;
  
  for (let i = 0; i < lines.length - 1; i++) {
    const current = lines[i];
    const next = lines[i + 1];
    
    // 检查是否是 序号 + 类型 的模式
    if (/^\d+$/.test(current) && /^(出境|入境)$/.test(next)) {
      sequentialMatches++;
      if (sequentialMatches >= 2) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 从多行格式提取记录
 * 格式示例：
 * 1
 * 入境
 * 2026-03-27
 * 往来港澳通行证
 * CD4787529
 * 皇岗口岸
 */
function extractRecordsFromMultiLineFormat(lines: string[]): BorderRecord[] {
  const records: BorderRecord[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 查找记录起始行（纯数字序号）
    if (!/^\d+$/.test(line)) continue;
    
    const id = line;
    const type = lines[i + 1];
    const date = lines[i + 2];
    const documentName = lines[i + 3];
    const documentNumber = lines[i + 4];
    const port = lines[i + 5];
    
    // 验证各字段
    if (
      !type || !/^(出境|入境)$/.test(type) ||
      !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !documentName ||
      !documentNumber ||
      !port
    ) {
      continue;
    }
    
    // 检查下一行是否为航班号或下一条记录的序号
    let flightNumber: string | undefined;
    const nextLine = lines[i + 6];
    
    if (nextLine && !/^\d+$/.test(nextLine) && !isHeaderLine(nextLine)) {
      // 可能是航班号或口岸续行
      if (isPortContinuation(nextLine)) {
        // 口岸名称续行
        // 不需要额外处理，因为口岸名通常不会跨行在这种格式中
      } else if (/^[A-Z]{2}\d+/.test(nextLine)) {
        // 航班号格式：如 HU714, ZH661
        flightNumber = nextLine;
      }
    }
    
    records.push({
      id,
      type: type as "出境" | "入境",
      date,
      documentName,
      documentNumber,
      port,
      flightNumber,
    });
  }
  
  // 按序号排序
  records.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
  
  return records;
}

/**
 * 从单行格式提取记录
 * 格式：序号 类型 日期 证件名 证件号 口岸 [航班号]
 */
function extractRecordsFromSingleLineFormat(lines: string[]): BorderRecord[] {
  const records: BorderRecord[] = [];
  
  // 用于处理跨行口岸名称的缓冲区
  let pendingLine: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过表头行
    if (isHeaderLine(line)) {
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

  // 按序号排序
  records.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

  return records;
}

/**
 * 尝试解析记录行
 */
function tryParseRecord(line: string): BorderRecord | null {
  const normalizedLine = line.trim().replace(/\s+/g, " ");
  return parseRecordLine(normalizedLine);
}

/**
 * 判断是否为口岸名称的续行
 */
function isPortContinuation(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 0 && trimmed.length <= 4) {
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

  // 尝试从文本中提取证件号码
  // 先尝试匹配单行格式的第一条记录
  let firstRecordMatch = text.match(
    /\d+\s+(?:出境|入境)\s+\d{4}-\d{2}-\d{2}\s+\S+\s+(\w+)\s+/,
  );
  
  // 如果没找到，尝试多行格式
  if (!firstRecordMatch) {
    // 多行格式：序号后的第4行是证件号
    const multiLineMatch = text.match(/^(\d+)\s*\n\s*(?:出境|入境)\s*\n\s*\d{4}-\d{2}-\d{2}\s*\n\s*\S+\s*\n\s*(\w+)/m);
    if (multiLineMatch) {
      firstRecordMatch = multiLineMatch;
    }
  }

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
    /^类纸质文件/,
    /^在差错或者缺漏/,
    /^航班号$/,
  ];

  return headerPatterns.some((pattern) => pattern.test(line));
}

/**
 * 判断是否为记录行
 * 格式：序号 出境/入境 日期 证件名 证件号 口岸 [航班号]
 */
export function isRecordLine(line: string): boolean {
  const recordPattern =
    /^\d+\s+(出境|入境)\s+\d{4}-\d{2}-\d{2}\s+\S+\s+\S+\s+\S+/;

  if (line.includes("出境/入境") && line.includes("出入境日期")) {
    return false;
  }

  return recordPattern.test(line);
}

/**
 * 解析单条记录行
 */
export function parseRecordLine(line: string): BorderRecord | null {
  const normalizedLine = line.trim().replace(/\s+/g, " ");
  
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
