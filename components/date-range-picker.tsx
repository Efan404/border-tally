"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { DateRange } from "react-day-picker";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date | undefined) {
  return d ? String(d.getTime()) : "";
}

const CST_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 将任意 Date 映射为“东八区日历日（date-only）”，并用 UTC 00:00 作为稳定锚点返回。
 * 这样无论用户机器时区是什么，日期范围语义都稳定按东八区计算。
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

function formatDate(date: Date | undefined) {
  if (!date) return "";
  const cst = toCSTDateOnly(date);
  return `${cst.getUTCFullYear()}-${pad2(cst.getUTCMonth() + 1)}-${pad2(
    cst.getUTCDate(),
  )}`;
}

/**
 * 严格解析 YYYY-MM-DD：
 * - 必须完全匹配 /^\d{4}-\d{2}-\d{2}$/（不接受 2025-1-1）
 * - 使用 UTC 构造，避免本地时区导致日历日偏移
 * - 校验日期组件一致性（例如 2025-02-31 会失败）
 */
function parseInputDate(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!m) return undefined;

  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const day = Number(m[3]); // 1-31

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return undefined;
  }
  if (month < 1 || month > 12) return undefined;
  if (day < 1 || day > 31) return undefined;

  const base = new Date(Date.UTC(year, month - 1, day));

  if (
    base.getUTCFullYear() !== year ||
    base.getUTCMonth() !== month - 1 ||
    base.getUTCDate() !== day
  ) {
    return undefined;
  }

  return toCSTDateOnly(base);
}

function addMonthsUTCDateOnly(
  startCSTDateOnly: Date,
  monthsToAdd: number,
): Date {
  // Month-based duration is closer to “academic program length”
  // and is easier for users to pick. Keep “same day-of-month first”.
  const end = new Date(
    Date.UTC(
      startCSTDateOnly.getUTCFullYear(),
      startCSTDateOnly.getUTCMonth() + monthsToAdd,
      startCSTDateOnly.getUTCDate(),
    ),
  );
  return toCSTDateOnly(end);
}

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  disabled?: boolean;
}

/**
 * 交互形态（回退到更稳更清晰的“双输入 + 双 Popover”）：
 * - 两个输入框分别控制 from/to
 * - 各自有对应的 Popover 日历按钮
 * - 视觉上通过并排布局 + 简洁提示让“区间”关联更强
 * - 保留更新后的文案 & 增加不突兀的学制快捷按钮（基于开始日期 +12/+18 个月）
 */
export function DateRangePicker({
  date,
  onDateChange,
  disabled = false,
}: DateRangePickerProps) {
  const [openFrom, setOpenFrom] = React.useState(false);
  const [openTo, setOpenTo] = React.useState(false);

  // Derive normalized CST date-only anchors
  const from = date?.from ? toCSTDateOnly(date.from) : undefined;
  const to = date?.to ? toCSTDateOnly(date.to) : undefined;

  // Stable keys for effect deps (avoid churn from new Date instances)
  const fromKey = dateKey(from);
  const toKey = dateKey(to);

  const [fromMonth, setFromMonth] = React.useState<Date>(
    from ?? toCSTDateOnly(new Date()),
  );
  const [toMonth, setToMonth] = React.useState<Date>(
    to ?? from ?? toCSTDateOnly(new Date()),
  );

  const [fromValue, setFromValue] = React.useState(formatDate(from));
  const [toValue, setToValue] = React.useState(formatDate(to));

  React.useEffect(() => {
    const nextFromValue = formatDate(from);
    const nextToValue = formatDate(to);

    setFromValue((prev) => (prev === nextFromValue ? prev : nextFromValue));
    setToValue((prev) => (prev === nextToValue ? prev : nextToValue));

    // Keep month views reasonable
    setFromMonth((prev) => {
      const next = from ?? toCSTDateOnly(new Date());
      return prev.getTime() === next.getTime() ? prev : next;
    });

    setToMonth((prev) => {
      const next = to ?? from ?? toCSTDateOnly(new Date());
      return prev.getTime() === next.getTime() ? prev : next;
    });
  }, [fromKey, toKey]);

  const setFrom = (nextFrom: Date | undefined) => {
    const nf = nextFrom ? toCSTDateOnly(nextFrom) : undefined;

    // choosing a new from: if to is earlier, clear to
    const next: DateRange = { from: nf, to };
    if (nf && to && to.getTime() < nf.getTime()) {
      next.to = undefined;
      setToValue("");
    }

    onDateChange(nf ? next : undefined);
  };

  const setTo = (nextTo: Date | undefined) => {
    if (!from) {
      // If no from, keep range empty
      onDateChange(undefined);
      return;
    }
    const nt = nextTo ? toCSTDateOnly(nextTo) : undefined;
    onDateChange({ from, to: nt });
  };

  const applyQuickDuration = (monthsToAdd: number) => {
    if (!from) return;

    const endCst = addMonthsUTCDateOnly(from, monthsToAdd);
    onDateChange({ from, to: endCst });
    setToValue(formatDate(endCst));
    setToMonth(endCst);
    setOpenTo(false);
  };

  return (
    <Card className={disabled ? "opacity-50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          设定留学期间
        </CardTitle>
        <CardDescription>请确认您的在校学习时间</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Header row: label + unobtrusive quick picks */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Label className="text-sm font-medium text-slate-700">
            学习起止时间
          </Label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled || !from}
              onClick={() => applyQuickDuration(12)}
              className={[
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                disabled || !from
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-white/60",
                "border-blue-200/60 bg-white/30 text-slate-700",
              ].join(" ")}
              title="从开始日期起，加 12 个月"
            >
              1年制（+12个月）
            </button>
            <button
              type="button"
              disabled={disabled || !from}
              onClick={() => applyQuickDuration(18)}
              className={[
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                disabled || !from
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-white/60",
                "border-blue-200/60 bg-white/30 text-slate-700",
              ].join(" ")}
              title="从开始日期起，加 18 个月"
            >
              1.5年制（+18个月）
            </button>
          </div>
        </div>

        {/* Two inputs with two popovers; visually grouped */}
        <div className="mt-3 rounded-xl border border-blue-200/60 bg-white/35 p-4">
          {/* First-principles layout:
              - Symmetry: from/to must share identical structure + width.
              - Proximity: arrow belongs BETWEEN the two fields (not off to the side).
              - Simplicity: one row on desktop; clean stacked on mobile.
          */}
          <div className="grid gap-4 sm:grid-cols-[1fr_40px_1fr] sm:items-end">
            {/* From */}
            <div className="space-y-2">
              <Label
                htmlFor="date-from"
                className="text-sm font-medium text-slate-700"
              >
                开始日期
              </Label>

              <div className="relative">
                <Input
                  id="date-from"
                  value={fromValue}
                  placeholder="YYYY-MM-DD"
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}-\d{2}"
                  className="h-10 w-full border-blue-200/60 bg-white/60 pr-10"
                  disabled={disabled}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setFromValue(nextValue);

                    const parsed = parseInputDate(nextValue);
                    if (parsed) {
                      setFrom(parsed);
                      setFromMonth(parsed);
                      // If to exists but becomes invalid, it will be cleared in setFrom
                    } else if (!nextValue.trim()) {
                      // Clearing from clears full range
                      onDateChange(undefined);
                      const today = toCSTDateOnly(new Date());
                      setFromMonth(today);
                      setToMonth(today);
                      setToValue("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setOpenFrom(true);
                    }
                  }}
                />

                <Popover open={openFrom} onOpenChange={setOpenFrom}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="absolute top-1/2 right-2 size-7 -translate-y-1/2"
                      disabled={disabled}
                      aria-label="选择开始日期"
                    >
                      <CalendarIcon className="size-4" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={from}
                      month={fromMonth}
                      onMonthChange={(m) => setFromMonth(toCSTDateOnly(m))}
                      onSelect={(d) => {
                        setFrom(d);
                        setFromValue(formatDate(d));
                        setOpenFrom(false);
                        if (d) {
                          // Guide user to pick end date next
                          setOpenTo(true);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Arrow (desktop only): centered between fields */}
            <div className="pointer-events-none hidden sm:flex sm:h-10 sm:items-center sm:justify-center">
              <ArrowRight
                className="size-4 text-slate-300"
                aria-hidden="true"
              />
            </div>

            {/* To */}
            <div className="space-y-2">
              <Label
                htmlFor="date-to"
                className="text-sm font-medium text-slate-700"
              >
                结束日期（毕业日期）
              </Label>

              <div className="relative">
                <Input
                  id="date-to"
                  value={toValue}
                  placeholder="YYYY-MM-DD"
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}-\d{2}"
                  className="h-10 w-full border-blue-200/60 bg-white/60 pr-10"
                  disabled={disabled || !from}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setToValue(nextValue);

                    const parsed = parseInputDate(nextValue);
                    if (parsed) {
                      setTo(parsed);
                      setToMonth(parsed);
                    } else if (!nextValue.trim()) {
                      // clearing to keeps from
                      if (from) onDateChange({ from, to: undefined });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      if (from) setOpenTo(true);
                    }
                  }}
                />

                <Popover open={openTo} onOpenChange={setOpenTo}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="absolute top-1/2 right-2 size-7 -translate-y-1/2"
                      disabled={disabled || !from}
                      aria-label="选择结束日期"
                    >
                      <CalendarIcon className="size-4" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={to}
                      month={toMonth}
                      onMonthChange={(m) => setToMonth(toCSTDateOnly(m))}
                      onSelect={(d) => {
                        setTo(d);
                        setToValue(formatDate(d));
                        setOpenTo(false);
                      }}
                      disabled={(d) => {
                        // Disable dates earlier than from
                        return !!from && d < from;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {from && to && to.getTime() < from.getTime() && (
          <p className="mt-3 text-sm text-destructive">
            结束日期必须晚于开始日期
          </p>
        )}
      </CardContent>
    </Card>
  );
}
