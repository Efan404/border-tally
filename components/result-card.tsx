"use client";

import { useState } from "react";
import { type PieSectorDataItem } from "recharts/types/polar/Pie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Globe, Home, Car, Info } from "lucide-react";
import { CalculationResult } from "@/types";
import { Label, Pie, PieChart, Sector } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ResultCardProps {
  result: CalculationResult;
  dateRange: { from: Date; to: Date };
  futureDays: number; // 从明天到毕业(含毕业) 的日历天数；由上层根据所选证件口径与日期范围计算
}

function normalizeToCSTDateOnly(d: Date): Date {
  const shifted = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ),
  );
}

function daysInclusiveCST(from: Date, to: Date): number {
  const a = normalizeToCSTDateOnly(from).getTime();
  const b = normalizeToCSTDateOnly(to).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  if (b < a) return 0;
  return Math.floor((b - a) / msPerDay) + 1;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

export function ResultCard({ result, dateRange, futureDays }: ResultCardProps) {
  const queryFrom = normalizeToCSTDateOnly(dateRange.from);
  const queryTo = normalizeToCSTDateOnly(dateRange.to);

  const todayCST = normalizeToCSTDateOnly(new Date());

  // 已发生区间：[from, min(to, today)]
  const pastEnd = minDate(queryTo, todayCST);
  const pastDays = daysInclusiveCST(queryFrom, pastEnd);

  const overseasDaysPast = Math.min(result.totalOverseasDays, pastDays);
  const domesticDays = pastDays - overseasDaysPast;

  const showFuture = futureDays > 0;

  // 计算总天数（从开学到毕业）
  const totalDays = daysInclusiveCST(queryFrom, queryTo);

  // 免税车申购资格：≥ 270 天
  const targetDays = 270;
  const eligible = overseasDaysPast >= targetDays;
  const remainingDays = Math.max(0, targetDays - overseasDaysPast);

  /**
   * 上海落户资格（按学历分档）：
   * - 本科：境外天数 >= 720
   * - 硕士：>= 180
   * - 博士：>= 360
   *
   * 说明：这里同样按“截至今日的境外天数（past）”判断；未来区间不计入。
   */
  const shanghaiRules = [
    { label: "本科", threshold: 720 },
    { label: "硕士", threshold: 180 },
    { label: "博士", threshold: 360 },
  ] as const;

  type ShanghaiDegree = (typeof shanghaiRules)[number]["label"];
  const [shanghaiDegree, setShanghaiDegree] = useState<ShanghaiDegree>("本科");

  const selectedShanghaiRule =
    shanghaiRules.find((r) => r.label === shanghaiDegree) ?? shanghaiRules[0];

  const shanghaiEligible = overseasDaysPast >= selectedShanghaiRule.threshold;
  const shanghaiRemainingDays = Math.max(
    0,
    selectedShanghaiRule.threshold - overseasDaysPast,
  );

  // 准备图表数据
  const chartData = [
    {
      category: "境外停留",
      days: overseasDaysPast,
      fill: "var(--color-chart-1)",
    },
    {
      category: "境内停留",
      days: domesticDays,
      fill: "var(--color-chart-2)",
    },
    ...(showFuture
      ? [
          {
            category: "未来可用",
            days: futureDays,
            fill: "var(--color-chart-3)",
          },
        ]
      : []),
  ];

  const chartConfig = {
    days: {
      label: "天数",
    },
    境外停留: {
      label: "境外停留",
      color: "hsl(var(--chart-1))",
    },
    境内停留: {
      label: "境内停留",
      color: "hsl(var(--chart-2))",
    },
    未来可用: {
      label: "未来可用",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Globe className="h-5 w-5" />
              境外停留分析
            </CardTitle>
            {/*<CardDescription className="text-blue-600">
              {format(queryFrom, "yyyy年MM月dd日")} 至{" "}
              {format(queryTo, "yyyy年MM月dd日")}
              <Badge
                variant="secondary"
                className="bg-blue-500 text-white dark:bg-blue-600"
              >
                共 {totalDays} 天
              </Badge>
            </CardDescription>*/}
          </div>

          {showFuture && (
            <Badge
              variant="outline"
              title="毕业时间在未来：未来天数不会计入境外/境内占比，仅作为预计剩余展示。"
              className="bg-white/60 text-blue-700 border-blue-200"
            >
              含未来区间
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Recharts 饼图 */}
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="days"
              nameKey="category"
              innerRadius={80}
              strokeWidth={5}
              activeIndex={0}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <Sector {...props} outerRadius={outerRadius + 10} />
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 10}
                          className="fill-blue-600 text-4xl font-bold"
                        >
                          {overseasDaysPast} 天
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 30}
                          className="fill-slate-500 text-sm"
                        >
                          境外停留
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* 状态栏：左侧描边样式 */}
        <div className="mt-6 space-y-4">
          {/* 免税车申购资格 */}
          <div
            className={`rounded-lg p-4 flex items-start gap-3 ${
              eligible ? "bg-emerald-50/30" : "bg-orange-50/30"
            }`}
            style={{
              borderLeft: `4px solid ${eligible ? "rgb(16 185 129)" : "rgb(249 115 22)"}`,
            }}
          >
            <Car
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                eligible ? "text-emerald-600" : "text-orange-600"
              }`}
            />

            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    免税车申购资格
                  </div>

                  <HoverCard openDelayMs={120} closeDelayMs={80}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        aria-label="查看说明"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </HoverCardTrigger>

                    <HoverCardContent
                      align="end"
                      className="text-xs leading-relaxed"
                    >
                      <div className="font-medium text-slate-900">说明</div>
                      <div className="mt-1 text-slate-600">
                        以截至今日的境外天数计算（未来区间不计入）。
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>

                <Badge
                  variant="outline"
                  className={
                    eligible
                      ? "bg-emerald-100/70 text-emerald-800 border-emerald-300"
                      : "bg-orange-100/70 text-orange-800 border-orange-300"
                  }
                >
                  {eligible ? "已达标" : "待达标"}
                </Badge>
              </div>

              {eligible ? (
                <div className="mt-1 text-sm text-slate-700">
                  恭喜！您的境外停留时长已满足申请条件。
                </div>
              ) : (
                <div className="mt-1 text-sm text-slate-700">
                  当前进度 {overseasDaysPast}/{targetDays}{" "}
                  天，距离目标还需境外居住{" "}
                  <span className="font-semibold text-orange-700">
                    {remainingDays}
                  </span>{" "}
                  天
                </div>
              )}
            </div>
          </div>

          {/* 上海落户资格 */}
          <div
            className={`rounded-lg p-4 flex items-start gap-3 ${
              shanghaiEligible ? "bg-emerald-50/30" : "bg-orange-50/30"
            }`}
            style={{
              borderLeft: `4px solid ${
                shanghaiEligible ? "rgb(16 185 129)" : "rgb(249 115 22)"
              }`,
            }}
          >
            <Home
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                shanghaiEligible ? "text-emerald-600" : "text-orange-600"
              }`}
            />

            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    上海落户资格
                  </div>

                  <HoverCard openDelayMs={120} closeDelayMs={80}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        aria-label="查看说明"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </HoverCardTrigger>

                    <HoverCardContent
                      align="end"
                      className="text-xs leading-relaxed"
                    >
                      <div className="font-medium text-slate-900">说明</div>
                      <div className="mt-1 text-slate-600">
                        以截至今日的境外天数计算（未来区间不计入）。
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>

                <Badge
                  variant="outline"
                  className={
                    shanghaiEligible
                      ? "bg-emerald-100/70 text-emerald-800 border-emerald-300"
                      : "bg-orange-100/70 text-orange-800 border-orange-300"
                  }
                >
                  {shanghaiEligible ? "已达标" : "待达标"}
                </Badge>
              </div>

              {/* Degree selector (tabs-like segmented control) */}
              <div className="mt-2 inline-flex rounded-md border border-blue-200/60 bg-white/50 p-1">
                {shanghaiRules.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => setShanghaiDegree(r.label)}
                    className={[
                      "px-3 py-1 text-xs rounded-md transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                      shanghaiDegree === r.label
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-white/70",
                    ].join(" ")}
                    aria-pressed={shanghaiDegree === r.label}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {shanghaiEligible ? (
                <div className="mt-2 text-sm text-slate-700">
                  恭喜！按{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedShanghaiRule.label}
                  </span>{" "}
                  口径，您的境外停留时长已满足条件（≥{" "}
                  {selectedShanghaiRule.threshold} 天）。
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-700">
                  按{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedShanghaiRule.label}
                  </span>{" "}
                  口径，当前 {overseasDaysPast}/{selectedShanghaiRule.threshold}{" "}
                  天，还需{" "}
                  <span className="font-semibold text-orange-700">
                    {shanghaiRemainingDays}
                  </span>{" "}
                  天
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
