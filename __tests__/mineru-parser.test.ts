import {
  extractRecordsFromMarkdown,
  extractPersonInfoFromMarkdown,
  crossValidateResults,
  checkMinerULimits,
} from "@/lib/mineru-parser";
import type { BorderRecord } from "@/types";

describe("mineru-parser / extractRecordsFromMarkdown", () => {
  test("should extract records from HTML table format (MinerU actual format)", () => {
    const markdown = `
# 国家移民管理局出入境记录查询结果

查询人姓名: 张某某

<table>
<tr><td>序号</td><td>出境/入境</td><td>出入境日期</td><td>证件名称</td><td>证件号码</td><td>出入境口岸</td><td>航班号</td></tr>
<tr><td>1</td><td>入境</td><td>2026-04-04</td><td>往来港澳通行证</td><td>TEST1234</td><td>深圳湾口岸</td><td></td></tr>
<tr><td>2</td><td>出境</td><td>2026-04-04</td><td>往来港澳通行证</td><td>TEST1234</td><td>深圳湾口岸</td><td></td></tr>
<tr><td>3</td><td>入境</td><td>2026-03-31</td><td>往来港澳通行证</td><td>TEST1234</td><td>深圳湾口岸</td><td></td></tr>
</table>

第 1 页 / 共 3 页
    `;

    const records = extractRecordsFromMarkdown(markdown);

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      id: "1",
      type: "入境",
      date: "2026-04-04",
      documentName: "往来港澳通行证",
      documentNumber: "TEST1234",
      port: "深圳湾口岸",
    });
  });

  test("should extract records from HTML table with rowspan/colspan attributes", () => {
    // MinerU 实际返回的格式包含 rowspan/colspan
    const markdown = `
<table><tr><td rowspan=1 colspan=1>序号</td><td rowspan=1 colspan=1>出境/入境</td><td rowspan=1 colspan=1>出入境日期</td><td rowspan=1 colspan=1>证件名称</td><td rowspan=1 colspan=1>证件号码</td><td rowspan=1 colspan=1>出入境口岸</td></tr>
<tr><td rowspan=1 colspan=1>1</td><td rowspan=1 colspan=1>入境</td><td rowspan=1 colspan=1>2026-04-04</td><td rowspan=1 colspan=1>往来港澳通行证</td><td rowspan=1 colspan=1>TEST1234</td><td rowspan=1 colspan=1>深圳湾口岸</td></tr>
<tr><td rowspan=1 colspan=1>2</td><td rowspan=1 colspan=1>出境</td><td rowspan=1 colspan=1>2026-04-04</td><td rowspan=1 colspan=1>往来港澳通行证</td><td rowspan=1 colspan=1>TEST1234</td><td rowspan=1 colspan=1>深圳湾口岸</td></tr>
</table>
    `;

    const records = extractRecordsFromMarkdown(markdown);

    expect(records).toHaveLength(2);
    expect(records[0].id).toBe("1");
    expect(records[1].id).toBe("2");
  });

  test("should extract records from markdown table format (fallback)", () => {
    const markdown = `
# 出入境记录

| 序号 | 出境/入境 | 出入境日期 | 证件名称 | 证件号码 | 出入境口岸 |
|------|-----------|------------|----------|----------|------------|
| 1 | 入境 | 2026-04-04 | 往来港澳通行证 | TEST1234 | 深圳湾口岸 |
| 2 | 出境 | 2026-04-04 | 往来港澳通行证 | TEST1234 | 深圳湾口岸 |

第 1 页 / 共 3 页
    `;

    const records = extractRecordsFromMarkdown(markdown);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      id: "1",
      type: "入境",
      date: "2026-04-04",
      documentName: "往来港澳通行证",
      documentNumber: "TEST1234",
      port: "深圳湾口岸",
    });
  });

  test("should extract records from multiple HTML tables", () => {
    // 模拟跨页时多个表格的情况
    const markdown = `
<table>
<tr><td>27</td><td>入境</td><td>2026-03-09</td><td>往来港澳通行证</td><td>TEST1234</td><td>深圳湾口岸</td></tr>
</table>

第 1 页 / 共 3 页

<table>
<tr><td>28</td><td>出境</td><td>2026-03-09</td><td>往来港澳通行证</td><td>TEST1234</td><td>深圳湾口岸</td></tr>
<tr><td>29</td><td>入境</td><td>2026-03-07</td><td>往来港澳通行证</td><td>TEST1234</td><td>深圳湾口岸</td></tr>
</table>
    `;

    const records = extractRecordsFromMarkdown(markdown);

    expect(records).toHaveLength(3);
    expect(records.map((r) => r.id)).toEqual(["27", "28", "29"]);
  });

  test("should handle MinerU actual output format", () => {
    // 更接近 MinerU 实际返回的格式
    const markdown = `
# 国家移民管理局出入境记录查询结果

<table><tr><td rowspan=1 colspan=1>序号</td><td rowspan=1 colspan=1>出境/入境</td><td rowspan=1 colspan=1>出入境日期</td><td rowspan=1 colspan=1>证件名称</td><td rowspan=1 colspan=1>证件号码</td><td rowspan=1 colspan=1>出入境口岸</td></tr>
<tr><td rowspan=1 colspan=1>1</td><td rowspan=1 colspan=1>入境</td><td rowspan=1 colspan=1>2026-04-04</td><td rowspan=1 colspan=1>往来港澳通行证</td><td rowspan=1 colspan=1>TEST1234</td><td rowspan=1 colspan=1>深圳湾口岸</td></tr>
<tr><td rowspan=1 colspan=1>28</td><td rowspan=1 colspan=1>出境</td><td rowspan=1 colspan=1>2026-03-09</td><td rowspan=1 colspan=1>往来港澳通行证</td><td rowspan=1 colspan=1>TEST1234</td><td rowspan=1 colspan=1>深圳湾口岸</td></tr>
<tr><td rowspan=1 colspan=1>66</td><td rowspan=1 colspan=1>出境</td><td rowspan=1 colspan=1>2025-12-22</td><td rowspan=1 colspan=1>往来港澳通行证</td><td rowspan=1 colspan=1>TEST1234</td><td rowspan=1 colspan=1>福田口岸</td></tr>
</table>
    `;

    const records = extractRecordsFromMarkdown(markdown);

    expect(records).toHaveLength(3);
    expect(records.map((r) => r.id)).toEqual(["1", "28", "66"]);
    // 验证跨页记录也能正确解析
    expect(records.find((r) => r.id === "28")).toBeDefined();
    expect(records.find((r) => r.id === "66")).toBeDefined();
  });

  test("should handle empty markdown", () => {
    const records = extractRecordsFromMarkdown("");
    expect(records).toHaveLength(0);
  });

  test("should handle markdown without records", () => {
    const markdown = `
# 国家移民管理局
出入境记录查询结果
查询人姓名：张某某
    `;
    const records = extractRecordsFromMarkdown(markdown);
    expect(records).toHaveLength(0);
  });

  test("should handle different document types", () => {
    const markdown = `
| 1 | 入境 | 2026-04-04 | 往来港澳通行证 | HKB1234 | 深圳湾口岸 |
| 2 | 出境 | 2026-03-15 | 普通护照 | PASS1234 | 北京首都机场 |
| 3 | 入境 | 2026-03-10 | 往来台湾通行证 | TW123456 | 厦门码头 |
    `;

    const records = extractRecordsFromMarkdown(markdown);

    expect(records).toHaveLength(3);
    expect(records[0].documentName).toBe("往来港澳通行证");
    expect(records[1].documentName).toBe("普通护照");
    expect(records[2].documentName).toBe("往来台湾通行证");
  });
});

describe("mineru-parser / extractPersonInfoFromMarkdown", () => {
  test("should extract person info from markdown", () => {
    const markdown = `
# 出入境记录查询结果

查询人姓名：张某某 ，性别: 男 ，出生日期: 1990年01月01日 ，
公民身份号码: 110101199001011234

| 序号 | 类型 | 日期 | 证件名 | 证件号 | 口岸 |
| 1 | 入境 | 2026-04-04 | 往来港澳通行证 | TEST1234 | 深圳湾 |
    `;

    const info = extractPersonInfoFromMarkdown(markdown);

    expect(info.name).toBe("张某某");
    expect(info.gender).toBe("男");
    expect(info.birthDate).toBe("1990年01月01日");
    expect(info.idNumber).toBe("110101199001011234");
    expect(info.documentNumber).toBe("TEST1234");
  });

  test("should handle markdown without person info", () => {
    const markdown = `
| 1 | 入境 | 2026-04-04 | 证件名 | TEST1234 | 口岸 |
    `;

    const info = extractPersonInfoFromMarkdown(markdown);

    expect(info.name).toBe("未知");
    expect(info.documentNumber).toBe("TEST1234");
  });
});

describe("mineru-parser / crossValidateResults", () => {
  const createRecords = (ids: string[]): BorderRecord[] => {
    return ids.map((id) => ({
      id,
      type: "入境" as const,
      date: "2026-04-04",
      documentName: "证件",
      documentNumber: "TEST",
      port: "口岸",
    }));
  };

  test("should return consistent when both results match", () => {
    const local = createRecords(["1", "2", "3"]);
    const mineru = createRecords(["1", "2", "3"]);

    const result = crossValidateResults(local, mineru);

    expect(result.consistent).toBe(true);
    expect(result.localOnly).toHaveLength(0);
    expect(result.mineruOnly).toHaveLength(0);
    expect(result.common).toHaveLength(3);
    expect(result.recommendation).toBe("local");
  });

  test("should detect mineru-only records", () => {
    const local = createRecords(["1", "2", "3"]);
    const mineru = createRecords(["1", "2", "3", "4", "5"]);

    const result = crossValidateResults(local, mineru);

    expect(result.consistent).toBe(false);
    expect(result.localOnly).toHaveLength(0);
    expect(result.mineruOnly).toHaveLength(2);
    expect(result.recommendation).toBe("mineru");
  });

  test("should detect local-only records", () => {
    const local = createRecords(["1", "2", "3", "4"]);
    const mineru = createRecords(["1", "2", "3"]);

    const result = crossValidateResults(local, mineru);

    expect(result.consistent).toBe(false);
    expect(result.localOnly).toHaveLength(1);
    expect(result.mineruOnly).toHaveLength(0);
    expect(result.recommendation).toBe("local");
  });

  test("should recommend manual review when both have unique records", () => {
    const local = createRecords(["1", "2", "3", "4"]);
    const mineru = createRecords(["1", "2", "3", "5"]);

    const result = crossValidateResults(local, mineru);

    expect(result.consistent).toBe(false);
    expect(result.localOnly).toHaveLength(1);
    expect(result.mineruOnly).toHaveLength(1);
    expect(result.recommendation).toBe("manual");
  });

  test("should handle empty results", () => {
    const local: BorderRecord[] = [];
    const mineru: BorderRecord[] = [];

    const result = crossValidateResults(local, mineru);

    expect(result.consistent).toBe(true);
    expect(result.common).toHaveLength(0);
    expect(result.recommendation).toBe("local");
  });
});

describe("mineru-parser / checkMinerULimits", () => {
  test("should accept valid PDF file", () => {
    const file = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });

    const result = checkMinerULimits(file);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("should reject oversized file", () => {
    const largeContent = new Uint8Array(11 * 1024 * 1024); // 11MB
    const file = new File([largeContent], "large.pdf", {
      type: "application/pdf",
    });

    const result = checkMinerULimits(file);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("超过限制");
  });

  test("should accept supported image types", () => {
    const imageTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    imageTypes.forEach((type) => {
      const file = new File(["content"], "test.jpg", { type });
      const result = checkMinerULimits(file);
      expect(result.valid).toBe(true);
    });
  });

  test("should reject unsupported file types", () => {
    const file = new File(["content"], "test.txt", {
      type: "text/plain",
    });

    const result = checkMinerULimits(file);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("不支持");
  });
});
