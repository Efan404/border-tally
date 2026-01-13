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
