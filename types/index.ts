// 核心类型定义

// 出入境记录类型
export interface BorderRecord {
  id: string;              // 唯一标识
  type: '出境' | '入境';   // 出/入境类型
  date: string;            // 日期 YYYY-MM-DD
  time?: string;           // 时间 HH:mm（如果PDF中有）
  port: string;            // 出入境口岸
  documentName: string;    // 证件名称
  documentNumber: string;  // 证件号码
  flightNumber?: string;   // 航班号（可选）
}

// 查询人基本信息
export interface QueryPersonInfo {
  name: string;           // 姓名
  gender?: string;        // 性别
  birthDate?: string;     // 出生日期
  idNumber?: string;      // 身份证号（部分隐藏）
  documentNumber: string; // 通行证号码
}

// 解析结果
export interface ParseResult {
  success: boolean;
  personInfo?: QueryPersonInfo;
  records: BorderRecord[];
  queryRange?: {
    startDate: string;
    endDate: string;
  };
  error?: string;
}

// 日期范围
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// 计算结果
export interface CalculationResult {
  totalOverseasDays: number;
  totalRecords: number;
  overseasRecords: BorderRecord[];
  domesticRecords: BorderRecord[];
}

// 数据验证问题类型
export type ValidationIssueType =
  | "document_mismatch" // 证件不匹配（已修正）
  | "same_day_multiple"; // 同一天多次出入境

// 单条验证问题
export interface ValidationIssue {
  type: ValidationIssueType;
  severity: "warning" | "info"; // warning需要用户注意，info仅提示已修正
  recordIds: string[]; // 涉及的记录ID
  message: string; // 友好的错误描述
  suggestion?: string; // 建议的处理方法
}

// 数据验证和修正的结果
export interface DataValidationResult {
  correctedRecords: BorderRecord[]; // 修正后的记录
  issues: ValidationIssue[]; // 检测到的问题列表
  originalRecordsCount: number; // 原始记录数
  correctedCount: number; // 被修正的记录数
}
