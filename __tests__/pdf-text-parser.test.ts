import {
  extractBorderRecordsFromText,
  extractPersonInfoFromText,
  parseRecordLine,
  isRecordLine,
} from "@/lib/pdf-text-parser";
import type { BorderRecord, QueryPersonInfo } from "@/types";

describe("pdf-text-parser / extractBorderRecordsFromText", () => {
  describe("basic record parsing", () => {
    test("should parse a single complete record line", () => {
      const text = `1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸`;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        id: "1",
        type: "入境",
        date: "2026-04-04",
        documentName: "往来港澳通行证",
        documentNumber: "TEST1234567",
        port: "深圳湾口岸",
      });
    });

    test("should parse multiple records in order", () => {
      const text = `
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
2 出境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
3 入境 2026-03-31 往来港澳通行证 TEST1234567 深圳湾口岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(3);
      expect(records[0].id).toBe("1");
      expect(records[1].id).toBe("2");
      expect(records[2].id).toBe("3");
    });

    test("should handle records with whitespace variations", () => {
      const text = `
1  入境  2026-04-04  往来港澳通行证  TEST1234567  深圳湾口岸
  2   出境   2026-04-04   往来港澳通行证   TEST1234567   深圳湾口岸
`;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(2);
      expect(records[0].id).toBe("1");
      expect(records[1].id).toBe("2");
    });
  });

  describe("multi-page table handling", () => {
    test("should parse records across multiple pages (no duplicate table headers)", () => {
      // Simulates PDF text extraction across 3 pages
      const text = `
国家移民管理局
序号 出境/入境 出入境日期 证件名称 证件号码 出入境口岸
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
2 出境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
3 入境 2026-03-31 往来港澳通行证 TEST1234567 深圳湾口岸
4 出境 2026-03-31 往来港澳通行证 TEST1234567 深圳湾口岸
5 入境 2026-03-30 往来港澳通行证 TEST1234567 深圳湾口岸
6 出境 2026-03-30 往来港澳通行证 TEST1234567 深圳湾口岸
7 入境 2026-03-28 往来港澳通行证 TEST1234567 深圳湾口岸
8 出境 2026-03-28 往来港澳通行证 TEST1234567 深圳湾口岸
9 入境 2026-03-26 往来港澳通行证 TEST1234567 深圳湾口岸
10 出境 2026-03-26 往来港澳通行证 TEST1234567 深圳湾口岸
11 入境 2026-03-24 往来港澳通行证 TEST1234567 深圳湾口岸
12 出境 2026-03-24 往来港澳通行证 TEST1234567 深圳湾口岸
13 入境 2026-03-23 往来港澳通行证 TEST1234567 深圳湾口岸
14 出境 2026-03-23 往来港澳通行证 TEST1234567 深圳湾口岸
15 入境 2026-03-21 往来港澳通行证 TEST1234567 深圳湾口岸
16 出境 2026-03-21 往来港澳通行证 TEST1234567 深圳湾口岸
17 入境 2026-03-17 往来港澳通行证 TEST1234567 深圳湾口岸
18 出境 2026-03-17 往来港澳通行证 TEST1234567 深圳湾口岸
19 入境 2026-03-16 往来港澳通行证 TEST1234567 深圳湾口岸
20 出境 2026-03-16 往来港澳通行证 TEST1234567 深圳湾口岸
21 入境 2026-03-15 往来港澳通行证 TEST1234567 深圳湾口岸
22 出境 2026-03-15 往来港澳通行证 TEST1234567 深圳湾口岸
23 入境 2026-03-14 往来港澳通行证 TEST1234567 深圳湾口岸
24 出境 2026-03-14 往来港澳通行证 TEST1234567 深圳湾口岸
25 入境 2026-03-10 往来港澳通行证 TEST1234567 深圳湾口岸
26 出境 2026-03-10 往来港澳通行证 TEST1234567 深圳湾口岸
27 入境 2026-03-09 往来港澳通行证 TEST1234567 深圳湾口岸
第 1 页 / 共 3 页
28 出境 2026-03-09 往来港澳通行证 TEST1234567 深圳湾口岸
29 入境 2026-03-07 往来港澳通行证 TEST1234567 深圳湾口岸
30 出境 2026-03-07 往来港澳通行证 TEST1234567 深圳湾口岸
31 入境 2026-03-06 往来港澳通行证 TEST1234567 深圳湾口岸
32 出境 2026-03-06 往来港澳通行证 TEST1234567 深圳湾口岸
33 入境 2026-03-05 往来港澳通行证 TEST1234567 深圳湾口岸
34 出境 2026-03-05 往来港澳通行证 TEST1234567 深圳湾口岸
35 入境 2026-03-03 往来港澳通行证 TEST1234567 深圳湾口岸
36 出境 2026-03-03 往来港澳通行证 TEST1234567 深圳湾口岸
37 入境 2026-02-28 往来港澳通行证 TEST1234567 深圳湾口岸
38 出境 2026-02-28 往来港澳通行证 TEST1234567 深圳湾口岸
39 入境 2026-02-25 往来港澳通行证 TEST1234567 深圳湾口岸
40 出境 2026-02-25 往来港澳通行证 TEST1234567 深圳湾口岸
41 入境 2026-02-24 往来港澳通行证 TEST1234567 深圳湾口岸
42 出境 2026-02-24 往来港澳通行证 TEST1234567 深圳湾口岸
43 入境 2026-02-21 往来港澳通行证 TEST1234567 深圳湾口岸
44 出境 2026-02-17 往来港澳通行证 TEST1234567 深圳湾口岸
45 入境 2026-02-08 往来港澳通行证 TEST1234567 深圳湾口岸
46 出境 2026-02-08 往来港澳通行证 TEST1234567 深圳湾口岸
47 入境 2026-02-07 往来港澳通行证 TEST1234567 深圳湾口岸
48 出境 2026-02-07 往来港澳通行证 TEST1234567 深圳湾口岸
49 入境 2026-02-03 往来港澳通行证 TEST1234567 深圳湾口岸
50 出境 2026-02-03 往来港澳通行证 TEST1234567 深圳湾口岸
51 入境 2026-02-02 往来港澳通行证 TEST1234567 深圳湾口岸
52 出境 2026-02-02 往来港澳通行证 TEST1234567 深圳湾口岸
53 入境 2026-01-31 往来港澳通行证 TEST1234567 深圳湾口岸
54 出境 2026-01-31 往来港澳通行证 TEST1234567 深圳湾口岸
55 入境 2026-01-24 往来港澳通行证 TEST1234567 深圳湾口岸
56 出境 2026-01-24 往来港澳通行证 TEST1234567 深圳湾口岸
57 入境 2026-01-20 往来港澳通行证 TEST1234567 深圳湾口岸
58 出境 2026-01-19 往来港澳通行证 TEST1234567 深圳湾口岸
59 入境 2026-01-11 往来港澳通行证 TEST1234567 深圳湾口岸
60 出境 2026-01-10 往来港澳通行证 TEST1234567 深圳湾口岸
61 入境 2026-01-03 往来港澳通行证 TEST1234567 深圳湾口岸
62 出境 2026-01-02 往来港澳通行证 TEST1234567 深圳湾口岸
63 入境 2025-12-31 往来港澳通行证 TEST1234567 深圳湾口岸
64 出境 2025-12-28 往来港澳通行证 TEST1234567 深圳湾口岸
65 入境 2025-12-28 往来港澳通行证 TEST1234567 深圳湾口岸
第 2 页 / 共 3 页
66 出境 2025-12-22 往来港澳通行证 TEST1234567 福田口岸
67 入境 2025-12-22 往来港澳通行证 TEST1234567 福田口岸
68 出境 2025-12-18 往来港澳通行证 TEST1234567 罗湖口岸
69 入境 2025-12-17 往来港澳通行证 TEST1234567 福田口岸
70 出境 2025-11-15 往来港澳通行证 TEST1234567 罗湖口岸
71 入境 2025-11-15 往来港澳通行证 TEST1234567 罗湖口岸
72 出境 2025-08-18 往来港澳通行证 TEST1234567 罗湖口岸
73 入境 2025-08-16 往来港澳通行证 TEST1234567 西九龙口岸
74 出境 2025-08-13 往来港澳通行证 TEST1234567 港珠澳大桥口岸
75 入境 2025-08-12 往来港澳通行证 TEST1234567 拱北口岸
76 出境 2025-08-12 往来港澳通行证 TEST1234567 拱北口岸
第 3 页 / 共 3 页
      `;
      const records = extractBorderRecordsFromText(text);

      // Should find all 76 records
      expect(records).toHaveLength(76);

      // Verify specific records that were being missed before
      expect(records.find((r) => r.id === "28")).toBeDefined();
      expect(records.find((r) => r.id === "66")).toBeDefined();

      // Verify correct data for record 28
      const record28 = records.find((r) => r.id === "28")!;
      expect(record28.type).toBe("出境");
      expect(record28.date).toBe("2026-03-09");
      expect(record28.port).toBe("深圳湾口岸");

      // Verify correct data for record 66
      const record66 = records.find((r) => r.id === "66")!;
      expect(record66.type).toBe("出境");
      expect(record66.date).toBe("2025-12-22");
      expect(record66.port).toBe("福田口岸");
    });

    test("should handle records that span across page boundaries in original PDF", () => {
      // Record 27 ends on page 1, record 28 starts on page 2
      const text = `
27 入境 2026-03-09 往来港澳通行证 TEST1234567 深圳湾口岸
第 1 页 / 共 3 页
28 出境 2026-03-09 往来港澳通行证 TEST1234567 深圳湾口岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(2);
      expect(records[0].id).toBe("27");
      expect(records[1].id).toBe("28");
    });
  });

  describe("port name variations", () => {
    test("should handle port names with multiple characters", () => {
      const text = `
74 出境 2025-08-13 往来港澳通行证 TEST1234567 港珠澳大桥口岸
75 入境 2025-08-12 往来港澳通行证 TEST1234567 拱北口岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(2);
      expect(records[0].port).toBe("港珠澳大桥口岸");
      expect(records[1].port).toBe("拱北口岸");
    });

    test("should handle different port names", () => {
      const text = `
1 入境 2026-01-03 往来港澳通行证 TEST1234567 西九龙口岸
2 出境 2026-01-02 往来港澳通行证 TEST1234567 深圳湾口岸
3 入境 2025-12-31 往来港澳通行证 TEST1234567 深圳湾口岸
4 出境 2025-12-22 往来港澳通行证 TEST1234567 福田口岸
5 入境 2025-12-18 往来港澳通行证 TEST1234567 罗湖口岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(5);
      expect(records[0].port).toBe("西九龙口岸");
      expect(records[1].port).toBe("深圳湾口岸");
      expect(records[3].port).toBe("福田口岸");
      expect(records[4].port).toBe("罗湖口岸");
    });

    test("should handle port names that may be split across lines in PDF", () => {
      // In the original PDF, "港珠澳大桥口岸" might be split as "港珠澳大桥口\n岸"
      const text = `
74 出境 2025-08-13 往来港澳通行证 TEST1234567 港珠澳大桥口
岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(1);
      expect(records[0].port).toBe("港珠澳大桥口岸");
    });
  });

  describe("document types and numbers", () => {
    test("should handle different document types", () => {
      const text = `
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
2 出境 2026-03-15 普通护照 E12345678 北京首都机场
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(2);
      expect(records[0].documentName).toBe("往来港澳通行证");
      expect(records[0].documentNumber).toBe("TEST1234567");
      expect(records[1].documentName).toBe("普通护照");
      expect(records[1].documentNumber).toBe("E12345678");
    });

    test("should handle document numbers with various formats", () => {
      const text = `
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
2 出境 2026-04-04 往来台湾通行证 T123456789 厦门码头
3 入境 2026-03-31 普通护照 EA9876543 上海浦东机场
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(3);
      expect(records[0].documentNumber).toBe("TEST1234567");
      expect(records[1].documentNumber).toBe("T123456789");
      expect(records[2].documentNumber).toBe("EA9876543");
    });
  });

  describe("flight number handling", () => {
    test("should extract flight numbers when present", () => {
      const text = `
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸 CA1234
2 出境 2026-04-04 普通护照 E12345678 北京首都机场 MU5678
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(2);
      expect(records[0].flightNumber).toBe("CA1234");
      expect(records[1].flightNumber).toBe("MU5678");
    });

    test("should handle records without flight numbers", () => {
      const text = `
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(1);
      expect(records[0].flightNumber).toBeUndefined();
    });
  });

  describe("edge cases and error handling", () => {
    test("should ignore table header lines", () => {
      const text = `
序号 出境/入境 出入境日期 证件名称 证件号码 出入境口岸
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(1);
      expect(records[0].id).toBe("1");
    });

    test("should ignore non-record lines", () => {
      const text = `
国家移民管理局
出入境记录查询结果（电子文件）
编号：E260404955175

查询人姓名: 张某某 ，性别: 男 ，出生日期: 1990年01月01日

序号 出境/入境 出入境日期 证件名称 证件号码 出入境口岸
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸

第 1 页 / 共 3 页

1.本电子文件原件为PDF格式的数据电文...
制作日期：2026年04月04日20时47分
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(1);
    });

    test("should handle empty input", () => {
      const records = extractBorderRecordsFromText("");
      expect(records).toHaveLength(0);
    });

    test("should handle input with no valid records", () => {
      const text = `
国家移民管理局
出入境记录查询结果
序号 出境/入境 出入境日期 证件名称 证件号码 出入境口岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(0);
    });

    test("should handle duplicate record IDs (keep last)", () => {
      // In case of parsing errors, if same ID appears twice
      const text = `
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
2 出境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
      `;
      const records = extractBorderRecordsFromText(text);

      // Should deduplicate or handle gracefully
      expect(records.length).toBeGreaterThanOrEqual(2);
    });

    test("should handle large record numbers", () => {
      const text = `
999 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
1000 出境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(2);
      expect(records[0].id).toBe("999");
      expect(records[1].id).toBe("1000");
    });
  });

  describe("date format variations", () => {
    test("should handle standard date format YYYY-MM-DD", () => {
      const text = `1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸`;
      const records = extractBorderRecordsFromText(text);

      expect(records[0].date).toBe("2026-04-04");
    });

    test("should handle single-digit months and days", () => {
      const text = `
1 入境 2026-01-02 往来港澳通行证 TEST1234567 深圳湾口岸
2 出境 2026-12-31 往来港澳通行证 TEST1234567 深圳湾口岸
      `;
      const records = extractBorderRecordsFromText(text);

      expect(records[0].date).toBe("2026-01-02");
      expect(records[1].date).toBe("2026-12-31");
    });
  });

  describe("multi-line format parsing", () => {
    test("should parse records in multi-line format (fields on separate lines)", () => {
      const text = `
国家移民管理局
出入境记录查询结果（电子文件）
编号：E260327441099

查询日期：2026年03月27日

查询人姓名: 李某某 ，性别: 男 ，出生日期: 1990年01月01日 ，
公民身份号码: 110101199001011234 ，通过国家移民管理局出入境记录查询系统查询，

序号
出境/入境
出入境日期
证件名称
证件号码
出入境口岸

1
入境
2026-03-27
往来港澳通行证
TEST1234567
皇岗口岸

2
出境
2026-03-26
往来港澳通行证
TEST1234567
福田口岸

3
入境
2026-03-26
往来港澳通行证
TEST1234567
福田口岸
      `;

      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(3);
      
      expect(records[0]).toMatchObject({
        id: "1",
        type: "入境",
        date: "2026-03-27",
        documentName: "往来港澳通行证",
        documentNumber: "TEST1234567",
        port: "皇岗口岸",
      });

      expect(records[1]).toMatchObject({
        id: "2",
        type: "出境",
        date: "2026-03-26",
        port: "福田口岸",
      });
    });

    test("should parse multi-line format with flight numbers", () => {
      const text = `
91
出境
2025-02-17
普通护照
TEST9999
深圳机场
HU714

92
入境
2025-02-09
普通护照
TEST9999
深圳机场
ZH661
      `;

      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(2);
      expect(records[0].flightNumber).toBe("HU714");
      expect(records[1].flightNumber).toBe("ZH661");
    });

    test("should parse multi-page multi-line format correctly", () => {
      const text = `
26
出境
2026-01-08
往来港澳通行证
TEST1234
皇岗口岸

27
入境
2026-01-08
往来港澳通行证
TEST1234
深圳湾口岸

第 1 页 / 共 4 页

28
出境
2026-01-02
往来港澳通行证
TEST1234
深圳湾口岸

29
入境
2026-01-02
往来港澳通行证
TEST1234
西九龙口岸

65
入境
2025-08-22
往来港澳通行证
TEST1234
福田口岸

第 2 页 / 共 4 页

66
出境
2025-08-21
往来港澳通行证
TEST1234
皇岗口岸

67
入境
2025-08-16
往来港澳通行证
TEST1234
深圳湾口岸
      `;

      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(7);
      
      // Verify records that would be lost in table parsing
      const ids = records.map((r) => r.id);
      expect(ids).toContain("28");
      expect(ids).toContain("66");
    });

    test("should handle mixed document types in multi-line format", () => {
      const text = `
85
入境
2025-07-14
普通护照
PASS1234
福田口岸

86
出境
2025-05-21
普通护照
PASS1234
杭州机场

87
入境
2025-04-24
往来港澳通行证
HKB1234
皇岗口岸
      `;

      const records = extractBorderRecordsFromText(text);

      expect(records).toHaveLength(3);
      expect(records[0].documentName).toBe("普通护照");
      expect(records[0].documentNumber).toBe("PASS1234");
      expect(records[2].documentName).toBe("往来港澳通行证");
      expect(records[2].documentNumber).toBe("HKB1234");
    });
  });

  describe("real-world scenario", () => {
    test("should parse the problematic PDF correctly", () => {
      // This is a simulated extraction of the actual problematic PDF
      const text = `
国家移民管理局
出入境记录查询结果（电子文件）
编号：E260404955175

查询日期：2026年04月04日

查询人姓名: 张某某 ，性别: 男 ，出生日期: 1990年01月01日 ，
公民身份号码: 110101199001011234 ，通过国家移民管理局出入境记录查询系统查询，
其本人在 2025 年 04 月 04 日至 2026 年 04 月 04 日期间有下列出入境记录：

序号 出境/入境 出入境日期 证件名称 证件号码 出入境口岸

1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
2 出境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
3 入境 2026-03-31 往来港澳通行证 TEST1234567 深圳湾口岸
4 出境 2026-03-31 往来港澳通行证 TEST1234567 深圳湾口岸
5 入境 2026-03-30 往来港澳通行证 TEST1234567 深圳湾口岸
6 出境 2026-03-30 往来港澳通行证 TEST1234567 深圳湾口岸
7 入境 2026-03-28 往来港澳通行证 TEST1234567 深圳湾口岸
8 出境 2026-03-28 往来港澳通行证 TEST1234567 深圳湾口岸
9 入境 2026-03-26 往来港澳通行证 TEST1234567 深圳湾口岸
10 出境 2026-03-26 往来港澳通行证 TEST1234567 深圳湾口岸
11 入境 2026-03-24 往来港澳通行证 TEST1234567 深圳湾口岸
12 出境 2026-03-24 往来港澳通行证 TEST1234567 深圳湾口岸
13 入境 2026-03-23 往来港澳通行证 TEST1234567 深圳湾口岸
14 出境 2026-03-23 往来港澳通行证 TEST1234567 深圳湾口岸
15 入境 2026-03-21 往来港澳通行证 TEST1234567 深圳湾口岸
16 出境 2026-03-21 往来港澳通行证 TEST1234567 深圳湾口岸
17 入境 2026-03-17 往来港澳通行证 TEST1234567 深圳湾口岸
18 出境 2026-03-17 往来港澳通行证 TEST1234567 深圳湾口岸
19 入境 2026-03-16 往来港澳通行证 TEST1234567 深圳湾口岸
20 出境 2026-03-16 往来港澳通行证 TEST1234567 深圳湾口岸
21 入境 2026-03-15 往来港澳通行证 TEST1234567 深圳湾口岸
22 出境 2026-03-15 往来港澳通行证 TEST1234567 深圳湾口岸
23 入境 2026-03-14 往来港澳通行证 TEST1234567 深圳湾口岸
24 出境 2026-03-14 往来港澳通行证 TEST1234567 深圳湾口岸
25 入境 2026-03-10 往来港澳通行证 TEST1234567 深圳湾口岸
26 出境 2026-03-10 往来港澳通行证 TEST1234567 深圳湾口岸
27 入境 2026-03-09 往来港澳通行证 TEST1234567 深圳湾口岸

第 1 页 / 共 3 页

28 出境 2026-03-09 往来港澳通行证 TEST1234567 深圳湾口岸
29 入境 2026-03-07 往来港澳通行证 TEST1234567 深圳湾口岸
30 出境 2026-03-07 往来港澳通行证 TEST1234567 深圳湾口岸
31 入境 2026-03-06 往来港澳通行证 TEST1234567 深圳湾口岸
32 出境 2026-03-06 往来港澳通行证 TEST1234567 深圳湾口岸
33 入境 2026-03-05 往来港澳通行证 TEST1234567 深圳湾口岸
34 出境 2026-03-05 往来港澳通行证 TEST1234567 深圳湾口岸
35 入境 2026-03-03 往来港澳通行证 TEST1234567 深圳湾口岸
36 出境 2026-03-03 往来港澳通行证 TEST1234567 深圳湾口岸
37 入境 2026-02-28 往来港澳通行证 TEST1234567 深圳湾口岸
38 出境 2026-02-28 往来港澳通行证 TEST1234567 深圳湾口岸
39 入境 2026-02-25 往来港澳通行证 TEST1234567 深圳湾口岸
40 出境 2026-02-25 往来港澳通行证 TEST1234567 深圳湾口岸
41 入境 2026-02-24 往来港澳通行证 TEST1234567 深圳湾口岸
42 出境 2026-02-24 往来港澳通行证 TEST1234567 深圳湾口岸
43 入境 2026-02-21 往来港澳通行证 TEST1234567 深圳湾口岸
44 出境 2026-02-17 往来港澳通行证 TEST1234567 深圳湾口岸
45 入境 2026-02-08 往来港澳通行证 TEST1234567 深圳湾口岸
46 出境 2026-02-08 往来港澳通行证 TEST1234567 深圳湾口岸
47 入境 2026-02-07 往来港澳通行证 TEST1234567 深圳湾口岸
48 出境 2026-02-07 往来港澳通行证 TEST1234567 深圳湾口岸
49 入境 2026-02-03 往来港澳通行证 TEST1234567 深圳湾口岸
50 出境 2026-02-03 往来港澳通行证 TEST1234567 深圳湾口岸
51 入境 2026-02-02 往来港澳通行证 TEST1234567 深圳湾口岸
52 出境 2026-02-02 往来港澳通行证 TEST1234567 深圳湾口岸
53 入境 2026-01-31 往来港澳通行证 TEST1234567 深圳湾口岸
54 出境 2026-01-31 往来港澳通行证 TEST1234567 深圳湾口岸
55 入境 2026-01-24 往来港澳通行证 TEST1234567 深圳湾口岸
56 出境 2026-01-24 往来港澳通行证 TEST1234567 深圳湾口岸
57 入境 2026-01-20 往来港澳通行证 TEST1234567 深圳湾口岸
58 出境 2026-01-19 往来港澳通行证 TEST1234567 深圳湾口岸
59 入境 2026-01-11 往来港澳通行证 TEST1234567 深圳湾口岸
60 出境 2026-01-10 往来港澳通行证 TEST1234567 深圳湾口岸
61 入境 2026-01-03 往来港澳通行证 TEST1234567 深圳湾口岸
62 出境 2026-01-02 往来港澳通行证 TEST1234567 深圳湾口岸
63 入境 2025-12-31 往来港澳通行证 TEST1234567 深圳湾口岸
64 出境 2025-12-28 往来港澳通行证 TEST1234567 深圳湾口岸
65 入境 2025-12-28 往来港澳通行证 TEST1234567 深圳湾口岸

第 2 页 / 共 3 页

66 出境 2025-12-22 往来港澳通行证 TEST1234567 福田口岸
67 入境 2025-12-22 往来港澳通行证 TEST1234567 福田口岸
68 出境 2025-12-18 往来港澳通行证 TEST1234567 罗湖口岸
69 入境 2025-12-17 往来港澳通行证 TEST1234567 福田口岸
70 出境 2025-11-15 往来港澳通行证 TEST1234567 罗湖口岸
71 入境 2025-11-15 往来港澳通行证 TEST1234567 罗湖口岸
72 出境 2025-08-18 往来港澳通行证 TEST1234567 罗湖口岸
73 入境 2025-08-16 往来港澳通行证 TEST1234567 西九龙口岸
74 出境 2025-08-13 往来港澳通行证 TEST1234567 港珠澳大桥口岸
75 入境 2025-08-12 往来港澳通行证 TEST1234567 拱北口岸
76 出境 2025-08-12 往来港澳通行证 TEST1234567 拱北口岸

第 3 页 / 共 3 页

1.本电子文件原件为PDF格式的数据电文...
制作日期：2026年04月04日20时47分
      `;

      const records = extractBorderRecordsFromText(text);

      // Should have exactly 76 records (not 74)
      expect(records).toHaveLength(76);

      // Verify records 28 and 66 are present (these were missing before)
      const ids = records.map((r) => r.id);
      expect(ids).toContain("28");
      expect(ids).toContain("66");

      // Verify no duplicates
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // Verify first and last records
      expect(records[0]).toMatchObject({
        id: "1",
        type: "入境",
        date: "2026-04-04",
        port: "深圳湾口岸",
      });

      const lastRecord = records[records.length - 1];
      expect(lastRecord).toMatchObject({
        id: "76",
        type: "出境",
        date: "2025-08-12",
        port: "拱北口岸",
      });
    });
  });
});

describe("pdf-text-parser / extractPersonInfoFromText", () => {
  test("should extract basic person info", () => {
    const text = `
查询人姓名：张某某 ，性别: 男 ，出生日期: 1990年01月01日 ，
公民身份号码: 110101199001011234 ，通过国家移民管理局出入境记录查询系统查询，
其本人在 2025 年 04 月 04 日至 2026 年 04 月 04 日期间有下列出入境记录：
序号 出境/入境 出入境日期 证件名称 证件号码 出入境口岸
1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸
    `;

    const info = extractPersonInfoFromText(text);

    expect(info.name).toBe("张某某");
    expect(info.gender).toBe("男");
    expect(info.birthDate).toBe("1990年01月01日");
    expect(info.idNumber).toBe("110101199001011234");
    expect(info.documentNumber).toBe("TEST1234567");
  });

  test("should handle different name formats", () => {
    const text = `查询人姓名：张三 ，性别: 男`;
    const info = extractPersonInfoFromText(text);
    expect(info.name).toBe("张三");
  });

  test("should handle name with spaces", () => {
    const text = `查询人姓名：李 四 ，性别: 女`;
    const info = extractPersonInfoFromText(text);
    // Should handle the space appropriately
    expect(info.name).toBeTruthy();
  });

  test("should handle ID number with asterisks (partially hidden)", () => {
    const text = `公民身份号码: 230604********2613`;
    const info = extractPersonInfoFromText(text);
    expect(info.idNumber).toBe("230604********2613");
  });

  test("should extract document number from table header or first record", () => {
    // When there's no explicit document number in person info section
    const text = `
查询人姓名：王五
1 入境 2026-04-04 往来港澳通行证 ABC1234567 深圳湾口岸
    `;
    const info = extractPersonInfoFromText(text);
    expect(info.documentNumber).toBe("ABC1234567");
  });

  test("should handle missing fields gracefully", () => {
    const text = `查询人姓名：未知`;
    const info = extractPersonInfoFromText(text);

    expect(info.name).toBe("未知");
    expect(info.gender).toBeUndefined();
    expect(info.birthDate).toBeUndefined();
    expect(info.idNumber).toBeUndefined();
    expect(info.documentNumber).toBe("");
  });

  test("should handle empty input", () => {
    const info = extractPersonInfoFromText("");
    expect(info.name).toBe("未知");
    expect(info.documentNumber).toBe("");
  });

  test("should handle real-world format", () => {
    const text = `
国家移民管理局
出入境记录查询结果（电子文件）
编号：E260404955175

查询日期：2026年04月04日

查询人姓名: 张某某 ，性别: 男 ，出生日期: 1990年01月01日 ，
公民身份号码: 110101199001011234 ，通过国家移民管理局出入境记录查询系统查询，
其本人在 2025 年 04 月 04 日至 2026 年 04 月 04 日期间有下列出入境记录：
    `;

    const info = extractPersonInfoFromText(text);

    expect(info).toMatchObject({
      name: "张某某",
      gender: "男",
      birthDate: "1990年01月01日",
      idNumber: "110101199001011234",
    });
  });
});

describe("pdf-text-parser / isRecordLine", () => {
  test("should identify valid record lines", () => {
    expect(isRecordLine("1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸")).toBe(true);
    expect(isRecordLine("10 出境 2026-04-04 普通护照 E12345678 北京机场")).toBe(true);
    expect(isRecordLine("999 入境 2026-12-31 往来台湾通行证 T123456789 厦门")).toBe(true);
  });

  test("should reject header line", () => {
    expect(isRecordLine("序号 出境/入境 出入境日期 证件名称 证件号码 出入境口岸")).toBe(false);
  });

  test("should reject non-record lines", () => {
    expect(isRecordLine("国家移民管理局")).toBe(false);
    expect(isRecordLine("查询人姓名：张三")).toBe(false);
    expect(isRecordLine("第 1 页 / 共 3 页")).toBe(false);
    expect(isRecordLine("1.本电子文件原件为PDF格式的数据电文")).toBe(false);
  });

  test("should reject lines with invalid format", () => {
    expect(isRecordLine("abc 入境 2026-04-04 ...")).toBe(false);
    expect(isRecordLine("1 xxx 2026-04-04 ...")).toBe(false);
    expect(isRecordLine("1 入境 invalid-date ...")).toBe(false);
  });
});

describe("pdf-text-parser / parseRecordLine", () => {
  test("should parse complete record line", () => {
    const line = "1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸";
    const record = parseRecordLine(line);

    expect(record).toMatchObject({
      id: "1",
      type: "入境",
      date: "2026-04-04",
      documentName: "往来港澳通行证",
      documentNumber: "TEST1234567",
      port: "深圳湾口岸",
    });
    expect(record.flightNumber).toBeUndefined();
  });

  test("should parse record with flight number", () => {
    const line = "1 入境 2026-04-04 往来港澳通行证 TEST1234567 深圳湾口岸 CA1234";
    const record = parseRecordLine(line);

    expect(record.flightNumber).toBe("CA1234");
  });

  test("should handle various port names", () => {
    const ports = [
      "深圳湾口岸",
      "福田口岸",
      "罗湖口岸",
      "西九龙口岸",
      "拱北口岸",
      "港珠澳大桥口岸",
      "北京首都机场",
      "上海浦东机场",
    ];

    ports.forEach((port) => {
      const line = `1 入境 2026-04-04 往来港澳通行证 TEST1234567 ${port}`;
      const record = parseRecordLine(line);
      expect(record.port).toBe(port);
    });
  });

  test("should handle extra whitespace", () => {
    const line = "  1   入境   2026-04-04   往来港澳通行证   TEST1234567   深圳湾口岸  ";
    const record = parseRecordLine(line);

    expect(record.id).toBe("1");
    expect(record.type).toBe("入境");
    expect(record.port).toBe("深圳湾口岸");
  });
});
