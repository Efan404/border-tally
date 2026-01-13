import { correctDocumentMatching } from "@/lib/data-correction";
import type { BorderRecord } from "@/types";

type BorderType = BorderRecord["type"];

function makeRecord(params: {
  id: string;
  date: string;
  type: BorderType;
  port?: string;
  documentName?: string;
  documentNumber?: string;
  time?: string;
  flightNumber?: string;
}): BorderRecord {
  return {
    id: params.id,
    date: params.date,
    type: params.type,
    port: params.port ?? "测试口岸",
    documentName: params.documentName ?? "普通护照",
    documentNumber: params.documentNumber ?? "E12345678",
    time: params.time,
    flightNumber: params.flightNumber,
  };
}

describe("correctDocumentMatching / data-correction", () => {
  test("修正证件不匹配：护照出境 → 港澳通行证入境", () => {
    const records: BorderRecord[] = [
      makeRecord({
        id: "1",
        date: "2024-01-01",
        type: "出境",
        documentName: "普通护照",
        documentNumber: "P001",
      }),
      makeRecord({
        id: "2",
        date: "2024-01-05",
        type: "入境",
        documentName: "往来港澳通行证",
        documentNumber: "H001",
      }),
    ];

    const result = correctDocumentMatching(records);

    // 应该修正了1条记录
    expect(result.correctedCount).toBe(1);

    // 入境记录的证件应该被修正为护照
    const entryRecord = result.correctedRecords.find((r) => r.id === "2");
    expect(entryRecord?.documentName).toBe("普通护照");
    expect(entryRecord?.documentNumber).toBe("P001");

    // 应该有1个证件不匹配的issue
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("document_mismatch");
    expect(result.issues[0].severity).toBe("info");
  });


  test("同日多次出入境检测", () => {
    const records: BorderRecord[] = [
      makeRecord({ id: "1", date: "2024-01-01", type: "出境", time: "08:00" }),
      makeRecord({ id: "2", date: "2024-01-01", type: "入境", time: "12:00" }),
      makeRecord({ id: "3", date: "2024-01-01", type: "出境", time: "14:00" }),
      makeRecord({ id: "4", date: "2024-01-01", type: "入境", time: "18:00" }),
    ];

    const result = correctDocumentMatching(records);

    // 应该检测到同日多次出入境
    const sameDayIssue = result.issues.find(
      (i) => i.type === "same_day_multiple",
    );
    expect(sameDayIssue).toBeDefined();
    expect(sameDayIssue?.severity).toBe("info");
  });

  test("多证件不交叉修正：每个证件独立配对", () => {
    const records: BorderRecord[] = [
      // 护照
      makeRecord({
        id: "1",
        date: "2024-01-01",
        type: "出境",
        documentName: "普通护照",
        documentNumber: "P001",
      }),
      // 港澳通行证（不应该被修正为护照）
      makeRecord({
        id: "2",
        date: "2024-01-02",
        type: "出境",
        documentName: "往来港澳通行证",
        documentNumber: "H001",
      }),
      makeRecord({
        id: "3",
        date: "2024-01-03",
        type: "入境",
        documentName: "往来港澳通行证",
        documentNumber: "H001",
      }),
      // 护照入境
      makeRecord({
        id: "4",
        date: "2024-01-05",
        type: "入境",
        documentName: "普通护照",
        documentNumber: "P001",
      }),
    ];

    const result = correctDocumentMatching(records);

    // 不应该有修正（证件都是匹配的）
    expect(result.correctedCount).toBe(0);

    // 港澳通行证应该保持不变
    const hkmEntry = result.correctedRecords.find((r) => r.id === "3");
    expect(hkmEntry?.documentName).toBe("往来港澳通行证");
    expect(hkmEntry?.documentNumber).toBe("H001");
  });

  test("正常情况：所有证件匹配，无异常", () => {
    const records: BorderRecord[] = [
      makeRecord({
        id: "1",
        date: "2024-01-01",
        type: "出境",
        documentNumber: "P001",
      }),
      makeRecord({
        id: "2",
        date: "2024-01-05",
        type: "入境",
        documentNumber: "P001",
      }),
      makeRecord({
        id: "3",
        date: "2024-02-01",
        type: "出境",
        documentNumber: "P001",
      }),
      makeRecord({
        id: "4",
        date: "2024-02-10",
        type: "入境",
        documentNumber: "P001",
      }),
    ];

    const result = correctDocumentMatching(records);

    // 不应该有任何修正
    expect(result.correctedCount).toBe(0);

    // 不应该有warning级别的issue
    const warnings = result.issues.filter((i) => i.severity === "warning");
    expect(warnings).toHaveLength(0);
  });
});
