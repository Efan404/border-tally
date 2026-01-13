import { calculateOverseasDays } from "@/lib/border-calculation";
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

describe("calculateOverseasDays / border-calculation", () => {
  test("same-day exit+entry counts as 1 overseas day (inclusive segment)", () => {
    const records: BorderRecord[] = [
      makeRecord({ id: "a2", date: "2024-11-20", type: "入境" }),
      makeRecord({ id: "a1", date: "2024-11-20", type: "出境" }),
    ]; // any order; calculation should be stable

    const result = calculateOverseasDays(
      records,
      new Date("2024-01-01"),
      new Date("2024-12-31"),
    );

    expect(result.totalOverseasDays).toBe(1);
  });

  test("given sample: 2024-03-15 exit, 2024-03-16 entry, 2024-11-20 exit+entry should be 3 days (2 + 1), NOT 292", () => {
    const records: BorderRecord[] = [
      makeRecord({ id: "b4", date: "2024-11-20", type: "入境" }),
      makeRecord({ id: "b3", date: "2024-11-20", type: "出境" }),
      makeRecord({ id: "b2", date: "2024-03-16", type: "入境" }),
      makeRecord({ id: "b1", date: "2024-03-15", type: "出境" }),
    ]; // any order; calculation should be stable

    const result = calculateOverseasDays(
      records,
      new Date("2024-01-01"),
      new Date("2024-12-31"),
    );

    expect(result.totalOverseasDays).toBe(3);
  });

  test("long domestic gap between trips must not be counted as overseas days", () => {
    const records: BorderRecord[] = [
      makeRecord({ id: "c4", date: "2024-12-11", type: "入境" }),
      makeRecord({ id: "c3", date: "2024-12-10", type: "出境" }),
      makeRecord({ id: "c2", date: "2024-02-02", type: "入境" }),
      makeRecord({ id: "c1", date: "2024-02-01", type: "出境" }),
    ];

    const result = calculateOverseasDays(
      records,
      new Date("2024-01-01"),
      new Date("2024-12-31"),
    );

    expect(result.totalOverseasDays).toBe(4);
  });

  test("mixed-document data should not inflate days (segments must be built within each documentNumber)", () => {
    // Passport: short trip in March (2 days)
    const passportExit = makeRecord({
      id: "p1",
      date: "2024-03-15",
      type: "出境",
      documentName: "普通护照",
      documentNumber: "P-001",
    });
    const passportEntry = makeRecord({
      id: "p2",
      date: "2024-03-16",
      type: "入境",
      documentName: "普通护照",
      documentNumber: "P-001",
    });

    // HKM permit: same-day round trip in Nov (1 day)
    const hkmExit = makeRecord({
      id: "h1",
      date: "2024-11-20",
      type: "出境",
      documentName: "往来港澳通行证",
      documentNumber: "H-002",
    });
    const hkmEntry = makeRecord({
      id: "h2",
      date: "2024-11-20",
      type: "入境",
      documentName: "往来港澳通行证",
      documentNumber: "H-002",
    });

    // Intentionally shuffle order and mix documents together.
    const records: BorderRecord[] = [
      hkmEntry,
      passportExit,
      hkmExit,
      passportEntry,
    ];

    const result = calculateOverseasDays(
      records,
      new Date("2024-01-01"),
      new Date("2024-12-31"),
    );

    // Correct behavior after 思路2: build segments per documentNumber, then merge:
    // Passport: 2024-03-15..2024-03-16 => 2
    // HKM:      2024-11-20..2024-11-20 => 1
    expect(result.totalOverseasDays).toBe(3);
  });

  test("regression: interleaved same-day multi-records across documents should not cross-mispair", () => {
    /**
     * 这个回归测试专门防“交错 + 多条 + 不同证件”导致的错配：
     * - 例如把护照的出境和港澳通行证的入境配成一段，从而把一大段国内时间误算成境外（出现 292 这类异常大值）。
     *
     * 由于当前算法会：
     * - 忽略 `time`
     * - 同一证件在同一天多条记录时，具体配对可能受到排序与“覆盖 openExit”的影响
     *
     * 因此这里不做“精确总天数”的脆弱断言，而是断言关键不变量：
     * 1) 统计结果不会超过查询区间的日历天数（inclusive）
     * 2) 在存在有效的跨日境外段时，至少会计入 2 天（11/20..11/21）
     * 3) 绝不会出现被拉长到几十/几百天的异常值
     */

    // Passport: same-day records (time is ignored by calculation)
    const pExit = makeRecord({
      id: "rx-p-exit",
      date: "2024-11-20",
      type: "出境",
      time: "08:00",
      documentName: "普通护照",
      documentNumber: "P-100",
    });
    const pEntry = makeRecord({
      id: "rx-p-entry",
      date: "2024-11-20",
      type: "入境",
      time: "23:10",
      documentName: "普通护照",
      documentNumber: "P-100",
    });

    // HKM permit: cross-day trip => should contribute 2 days within the query window
    const hExit = makeRecord({
      id: "rx-h-exit",
      date: "2024-11-20",
      type: "出境",
      time: "09:30",
      documentName: "往来港澳通行证",
      documentNumber: "H-200",
    });
    const hEntry = makeRecord({
      id: "rx-h-entry",
      date: "2024-11-21",
      type: "入境",
      time: "00:20",
      documentName: "往来港澳通行证",
      documentNumber: "H-200",
    });

    // Intentionally interleave and place entries/exits in a confusing order.
    const records: BorderRecord[] = [pEntry, hExit, pExit, hEntry];

    const queryFrom = new Date("2024-11-20");
    const queryTo = new Date("2024-11-21");

    const result = calculateOverseasDays(records, queryFrom, queryTo);

    // Query window is 2 days (inclusive). Overseas days must never exceed it.
    expect(result.totalOverseasDays).toBeLessThanOrEqual(2);

    // There is a valid HKM cross-day segment inside the query -> should be at least 2 days.
    expect(result.totalOverseasDays).toBeGreaterThanOrEqual(2);

    // Strong guard against the historical failure mode (292-like inflation).
    expect(result.totalOverseasDays).toBeLessThan(30);
  });

  test("range clipping: if query range only covers the long gap, overseas days should be 0", () => {
    const records: BorderRecord[] = [
      makeRecord({ id: "d4", date: "2024-11-20", type: "入境" }),
      makeRecord({ id: "d3", date: "2024-11-20", type: "出境" }),
      makeRecord({ id: "d2", date: "2024-03-16", type: "入境" }),
      makeRecord({ id: "d1", date: "2024-03-15", type: "出境" }),
    ];

    const result = calculateOverseasDays(
      records,
      new Date("2024-04-01"),
      new Date("2024-11-19"),
    );

    expect(result.totalOverseasDays).toBe(0);
  });
});
