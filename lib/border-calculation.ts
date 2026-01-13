import { BorderRecord, CalculationResult } from "@/types";
import { parseISO } from "date-fns";

/**
 * Overseas-days calculation unified to East-Asia (UTC+8 / China Standard Time) date semantics.
 *
 * WHY:
 * - Your PDF dates are guaranteed to be "CST calendar days" (东八区的日期语义) and are stored as YYYY-MM-DD.
 * - Your UI date-range selection is also intended to be CST calendar days.
 * - JavaScript `Date` is timezone-sensitive; mixing local-time parsing, UTC normalization, and `differenceInDays`
 *   can cause off-by-one day errors, leading to >100% ratios and negative domestic days.
 *
 * RULES:
 * - All comparisons/counting are done in "CST date-only" space.
 * - Segments are inclusive on BOTH ends: [出境日, 入境日] counts all days as overseas (each day counts as 1).
 * - If the newest record is 出境 (still abroad), the segment is open-ended to "today (CST date)" inclusive.
 *
 * Implementation:
 * - Convert any Date to a stable "CST date-only" anchor represented as a UTC midnight Date.
 * - Build abroad segments by walking records in chronological order (oldest -> newest).
 * - For a query [start, end], compute inclusive overlap days with each segment.
 */

type Segment = {
  exit: Date; // CST date-only anchor
  entry: Date | null; // CST date-only anchor; null means open segment (still abroad)
};

const CST_OFFSET_MS = 8 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Project any Date/time to its CST calendar day, and return it as a UTC-midnight Date.
 * This makes "date-only" math stable across any runtime timezone.
 */
function toCSTDateOnly(d: Date): Date {
  const shifted = new Date(d.getTime() + CST_OFFSET_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ),
  );
}

/**
 * Parse record.date (YYYY-MM-DD) as CST date-only.
 * NOTE: parseISO('YYYY-MM-DD') yields a Date at local midnight; we then map it into CST-day space.
 */
function parseRecordDateCST(recordDate: string): Date {
  return toCSTDateOnly(parseISO(recordDate));
}

function addDaysCST(dateOnly: Date, days: number): Date {
  return new Date(dateOnly.getTime() + days * MS_PER_DAY);
}

function daysInclusiveCST(start: Date, end: Date): number {
  const a = toCSTDateOnly(start).getTime();
  const b = toCSTDateOnly(end).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / MS_PER_DAY) + 1;
}

function intersectInclusiveCST(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): { start: Date; end: Date } | null {
  const start = new Date(
    Math.max(toCSTDateOnly(aStart).getTime(), toCSTDateOnly(bStart).getTime()),
  );
  const end = new Date(
    Math.min(toCSTDateOnly(aEnd).getTime(), toCSTDateOnly(bEnd).getTime()),
  );
  if (end.getTime() < start.getTime()) return null;
  return { start, end };
}

/**
 * 填充每一天的方式计算境外日期
 *
 * 算法：
 * 1. 按证件分组（每个证件独立处理）
 * 2. 每组内按时间顺序（从旧到新）遍历记录
 * 3. 维护"当前是否在境外"状态
 * 4. 如果在境外，把每一天都标记为境外日
 * 5. 遇到出境：状态变为"在境外"
 * 6. 遇到入境：状态变为"在境内"
 */
function fillOverseasDaysCST(
  records: BorderRecord[],
  todayCST: Date,
): Set<string> {
  const overseasDays = new Set<string>();

  const keyOf = (r: BorderRecord) =>
    `${r.documentNumber ?? ""}__${r.documentName ?? ""}`;

  const groups = new Map<string, BorderRecord[]>();
  for (const r of records) {
    const k = keyOf(r);
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [r]);
  }

  for (const [, groupRecords] of groups) {
    // 按序号排序：id 从大到小（从旧到新）
    // PDF中的记录序号：1=最新，N=最旧
    const chronological = [...groupRecords].sort((a, b) => {
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idB - idA; // 降序：从旧到新
    });

    let isAbroad = false;
    let lastExitDate: Date | null = null;

    for (const r of chronological) {
      const d = parseRecordDateCST(r.date);

      if (r.type === "出境") {
        // 如果之前已经在境外，先填充从上次出境到这次出境前一天的所有日期
        if (isAbroad && lastExitDate) {
          let current = new Date(lastExitDate.getTime());
          const dayBefore = addDaysCST(d, -1);
          while (current.getTime() <= dayBefore.getTime()) {
            overseasDays.add(formatDateCST(current));
            current = addDaysCST(current, 1);
          }
        }

        isAbroad = true;
        lastExitDate = d;
      } else if (r.type === "入境") {
        // 填充从出境日到入境日（含）的所有日期
        if (isAbroad && lastExitDate) {
          let current = new Date(lastExitDate.getTime());
          while (current.getTime() <= d.getTime()) {
            overseasDays.add(formatDateCST(current));
            current = addDaysCST(current, 1);
          }
        }

        isAbroad = false;
        lastExitDate = null;
      }
    }

    // 如果最后还在境外，填充到今天
    if (isAbroad && lastExitDate) {
      let current = new Date(lastExitDate.getTime());
      while (current.getTime() <= todayCST.getTime()) {
        overseasDays.add(formatDateCST(current));
        current = addDaysCST(current, 1);
      }
    }
  }

  return overseasDays;
}

function formatDateCST(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 仅用于UI展示：判断某个日期是否在境外
 */
function buildAbroadSegmentsCST(
  records: BorderRecord[],
  todayCST: Date,
): Segment[] {
  const keyOf = (r: BorderRecord) =>
    `${r.documentNumber ?? ""}__${r.documentName ?? ""}`;

  const groups = new Map<string, BorderRecord[]>();
  for (const r of records) {
    const k = keyOf(r);
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [r]);
  }

  const allSegments: Segment[] = [];

  for (const [, groupRecords] of groups) {
    const chronological = [...groupRecords].sort((a, b) => {
      const idA = parseInt(a.id) || 0;
      const idB = parseInt(b.id) || 0;
      return idB - idA;
    });

    let openExit: Date | null = null;

    for (const r of chronological) {
      const d = parseRecordDateCST(r.date);

      if (r.type === "出境") {
        openExit = d;
      } else if (r.type === "入境") {
        if (openExit) {
          allSegments.push({ exit: openExit, entry: d });
          openExit = null;
        }
      }
    }

    if (openExit) {
      allSegments.push({ exit: openExit, entry: null });
    }
  }

  return allSegments;
}

export function calculateOverseasDays(
  records: BorderRecord[],
  startDate: Date,
  endDate: Date,
): CalculationResult {
  // Normalize query bounds to CST date-only anchors
  const queryStart = toCSTDateOnly(startDate);
  const queryEnd = toCSTDateOnly(endDate);

  // Define "today" in CST date-only for open-ended segments
  const todayCST = toCSTDateOnly(new Date());

  // 使用"填充每一天"的方式计算境外日期
  const overseasDays = fillOverseasDaysCST(records, todayCST);

  // 统计查询范围内有多少天在境外
  let totalOverseasDays = 0;
  let current = new Date(queryStart.getTime());
  while (current.getTime() <= queryEnd.getTime()) {
    if (overseasDays.has(formatDateCST(current))) {
      totalOverseasDays++;
    }
    current = addDaysCST(current, 1);
  }

  // 构建段用于判断记录分类（overseasRecords vs domesticRecords）
  const segments = buildAbroadSegmentsCST(records, todayCST);

  // Classify records within query range for UI listing
  const recordsInRange = records.filter((r) => {
    const d = parseRecordDateCST(r.date);
    return (
      d.getTime() >= queryStart.getTime() && d.getTime() <= queryEnd.getTime()
    );
  });

  const isInAnySegment = (dCST: Date) => {
    for (const s of segments) {
      const segEnd = s.entry ?? todayCST;
      if (
        dCST.getTime() >= s.exit.getTime() &&
        dCST.getTime() <= segEnd.getTime()
      )
        return true;
    }
    return false;
  };

  const overseasRecords: BorderRecord[] = [];
  const domesticRecords: BorderRecord[] = [];

  for (const r of recordsInRange) {
    const d = parseRecordDateCST(r.date);
    if (isInAnySegment(d)) overseasRecords.push(r);
    else domesticRecords.push(r);
  }

  return {
    totalOverseasDays,
    totalRecords: recordsInRange.length,
    overseasRecords,
    domesticRecords,
  };
}

export function getDaysInRange(startDate: Date, endDate: Date): number {
  // Unified to CST (UTC+8) date semantics
  return daysInclusiveCST(startDate, endDate);
}
