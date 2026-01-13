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

function buildAbroadSegmentsCST(
  records: BorderRecord[],
  todayCST: Date,
): Segment[] {
  /**
   * 关键改动（思路2）：
   * - 不再依赖调用方传入的排序（newest->oldest / oldest->newest 都可以）
   * - 为了避免不同证件（港澳通行证/护照/不同号码）混在一起导致“错配闭合”
   *   产生超长境外段（例如被算出 292 天），在此函数内部做：
   *   1) 按证件分组（documentNumber + documentName）
   *   2) 组内按日期排序，且同日“出境”优先于“入境”
   *   3) 分组各自配对成 segment，最后把所有 segment 做统一 merge
   */

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
      const da = parseRecordDateCST(a.date).getTime();
      const db = parseRecordDateCST(b.date).getTime();
      if (da !== db) return da - db;

      // 同一天：先处理出境，再处理入境，这样“同日出+入”会形成 [d,d] = 1 天
      if (a.type === b.type) return 0;
      if (a.type === "出境") return -1;
      return 1;
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

    // 该证件最后仍在境外：开段到 todayCST
    if (openExit) {
      allSegments.push({ exit: openExit, entry: null });
    }
  }

  // Normalize: ensure exit <= entry if entry exists
  const normalized = allSegments
    .map((s) => {
      if (s.entry && s.entry.getTime() < s.exit.getTime()) {
        return { exit: s.entry, entry: s.exit };
      }
      return s;
    })
    .sort((a, b) => a.exit.getTime() - b.exit.getTime());

  // Merge overlaps/touches to avoid double counting (cross-document segments can overlap in pathological data)
  const merged: Segment[] = [];
  for (const s of normalized) {
    const end = s.entry ?? todayCST;

    if (merged.length === 0) {
      merged.push(s);
      continue;
    }

    const last = merged[merged.length - 1];
    const lastEnd = last.entry ?? todayCST;

    // If current starts on/before lastEnd + 1 day, merge.
    if (s.exit.getTime() <= lastEnd.getTime() + MS_PER_DAY) {
      const newEnd = new Date(Math.max(lastEnd.getTime(), end.getTime()));

      // If either segment is open-ended and the merged end reaches todayCST, keep it open-ended.
      const open =
        newEnd.getTime() === todayCST.getTime() &&
        (last.entry === null || s.entry === null);

      merged[merged.length - 1] = {
        exit: last.exit,
        entry: open ? null : newEnd,
      };
    } else {
      merged.push(s);
    }
  }

  return merged;
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

  /**
   * 思路2核心：计算函数内部兜底
   * - records 可乱序
   * - records 可包含多个证件（不同 documentNumber/documentName）
   * - 先分组再配对，避免跨证件错配造成超长境外段（例如 292 天）
   */
  const segments = buildAbroadSegmentsCST(records, todayCST);

  // Count overlap days between [queryStart, queryEnd] and each segment (inclusive)
  let totalOverseasDays = 0;
  for (const s of segments) {
    const segStart = s.exit;
    const segEnd = s.entry ?? todayCST;
    const ix = intersectInclusiveCST(queryStart, queryEnd, segStart, segEnd);
    if (ix) totalOverseasDays += daysInclusiveCST(ix.start, ix.end);
  }

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
