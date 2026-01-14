"use client";

import { useMemo, useState } from "react";
import { type PieSectorDataItem } from "recharts/types/polar/Pie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Globe, Home, Car, Info, ArrowLeftRight } from "lucide-react";
import { CalculationResult } from "@/types";
import { Label, Pie, PieChart, Sector } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type TransportIcon = "🚌" | "🚇" | "🚄" | "🚢" | "✈️" | "🚶🏻";

function getTransportIconForPort(port: string): TransportIcon {
  const p = (port ?? "").trim();

  // 1. 皇岗口岸是bus
  if (p.includes("皇岗")) return "🚌";

  // 2. 罗湖口岸是地铁
  if (p.includes("罗湖")) return "🚇";

  // 3. 福田口岸是地铁
  if (p.includes("福田")) return "🚇";

  // 4. 深圳灣口岸是bus（兼容“深圳湾”写法）
  if (p.includes("深圳灣") || p.includes("深圳湾")) return "🚌";

  // 5. 西九龙口岸是高铁
  if (p.includes("西九龙") || p.includes("西九龍")) return "🚄";

  // 6. 文锦渡口岸是bus（兼容“文锦渡/文錦渡”）
  if (p.includes("文锦渡") || p.includes("文錦渡")) return "🚌";

  // 7. 莲塘口岸是bus
  if (p.includes("莲塘") || p.includes("蓮塘")) return "🚌";

  // 8. 蛇口口岸是🚢
  if (p.includes("蛇口")) return "🚢";

  // 9. 其余的口岸带有“机场”就是✈️
  if (p.includes("机场")) return "✈️";

  // 10. 默认的是用🚶🏻填充
  return "🚶🏻";
}

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
  const [view, setView] = useState<"front" | "back">("front");
  const queryFrom = normalizeToCSTDateOnly(dateRange.from);
  const queryTo = normalizeToCSTDateOnly(dateRange.to);

  const todayCST = normalizeToCSTDateOnly(new Date());

  // 已发生区间：[from, min(to, today)]
  const pastEnd = minDate(queryTo, todayCST);
  const pastDays = daysInclusiveCST(queryFrom, pastEnd);

  const overseasDaysPast = Math.min(result.totalOverseasDays, pastDays);
  const domesticDays = pastDays - overseasDaysPast;

  const showFuture = futureDays > 0;

  const portTop3 = useMemo(() => {
    // 统计当前选择时间范围内的出入境记录（result.totalRecords 对应的记录集）
    // 目标：展示“最常去的口岸”TOP3
    const records = [...result.overseasRecords, ...result.domesticRecords];

    const counts = new Map<string, { count: number; icon: TransportIcon }>();

    for (const r of records) {
      const port = (r.port ?? "").trim();
      if (!port) continue;

      const prev = counts.get(port);
      if (!prev) {
        counts.set(port, {
          count: 1,
          icon: getTransportIconForPort(port),
        });
        continue;
      }

      // count++
      prev.count += 1;

      // 交通方式在“口岸维度”固定：首次命中规则即确定（机场只看“机场”两字）
      counts.set(port, prev);
    }

    const sorted = [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([port, meta], idx) => ({
        rank: idx + 1,
        port,
        count: meta.count,
        icon: meta.icon,
      }));

    return sorted;
  }, [result.domesticRecords, result.overseasRecords]);

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

  /**
   * 北京落户资格：
   * - 境外天数 >= 360
   *
   * 说明：同样按“截至今日的境外天数（past）”判断；未来区间不计入。
   */
  const beijingThresholdDays = 360;
  const beijingEligible = overseasDaysPast >= beijingThresholdDays;
  const beijingRemainingDays = Math.max(
    0,
    beijingThresholdDays - overseasDaysPast,
  );

  type EligibilityCard = {
    key: string;
    title: string;
    icon: React.ReactNode;
    eligible: boolean;
    badgeText: string;
    badgeClassName: string;
    containerClassName: string;
    borderLeftColor: string;
    helpText: string;
    body: React.ReactNode;
  };

  const eligibilityCards: EligibilityCard[] = [
    {
      key: "beijing-hukou",
      title: "北京落户资格",
      icon: (
        <Home
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
            beijingEligible ? "text-emerald-600" : "text-orange-600"
          }`}
        />
      ),
      eligible: beijingEligible,
      badgeText: beijingEligible ? "已达标" : "待达标",
      badgeClassName: beijingEligible
        ? "bg-emerald-100/70 text-emerald-800 border-emerald-300"
        : "bg-orange-100/70 text-orange-800 border-orange-300",
      containerClassName: beijingEligible
        ? "bg-emerald-50/30"
        : "bg-orange-50/30",
      borderLeftColor: beijingEligible ? "rgb(16 185 129)" : "rgb(249 115 22)",
      helpText: "以截至今日的境外天数计算（未来区间不计入）。",
      body: beijingEligible ? (
        <div className="mt-2 text-sm text-slate-700">
          恭喜！您的境外停留时长已满足条件（≥ {beijingThresholdDays} 天）。
        </div>
      ) : (
        <div className="mt-2 text-sm text-slate-700">
          当前 {overseasDaysPast}/{beijingThresholdDays} 天，还需{" "}
          <span className="font-semibold text-orange-700">
            {beijingRemainingDays}
          </span>{" "}
          天
        </div>
      ),
    },
    {
      key: "shanghai-hukou",
      title: "上海落户资格",
      icon: (
        <Home
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
            shanghaiEligible ? "text-emerald-600" : "text-orange-600"
          }`}
        />
      ),
      eligible: shanghaiEligible,
      badgeText: shanghaiEligible ? "已达标" : "待达标",
      badgeClassName: shanghaiEligible
        ? "bg-emerald-100/70 text-emerald-800 border-emerald-300"
        : "bg-orange-100/70 text-orange-800 border-orange-300",
      containerClassName: shanghaiEligible
        ? "bg-emerald-50/30"
        : "bg-orange-50/30",
      borderLeftColor: shanghaiEligible ? "rgb(16 185 129)" : "rgb(249 115 22)",
      helpText: "以截至今日的境外天数计算（未来区间不计入）。",
      body: (
        <>
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
        </>
      ),
    },
    {
      key: "taxfree-car",
      title: "免税车申购资格",
      icon: (
        <Car
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
            eligible ? "text-emerald-600" : "text-orange-600"
          }`}
        />
      ),
      eligible,
      badgeText: eligible ? "已达标" : "待达标",
      badgeClassName: eligible
        ? "bg-emerald-100/70 text-emerald-800 border-emerald-300"
        : "bg-orange-100/70 text-orange-800 border-orange-300",
      containerClassName: eligible ? "bg-emerald-50/30" : "bg-orange-50/30",
      borderLeftColor: eligible ? "rgb(16 185 129)" : "rgb(249 115 22)",
      helpText: "以截至今日的境外天数计算（未来区间不计入）。",
      body: eligible ? (
        <div className="mt-1 text-sm text-slate-700">
          恭喜！您的境外停留时长已满足申请条件。
        </div>
      ) : (
        <div className="mt-1 text-sm text-slate-700">
          当前进度 {overseasDaysPast}/{targetDays} 天，距离目标还需境外居住{" "}
          <span className="font-semibold text-orange-700">{remainingDays}</span>{" "}
          天
        </div>
      ),
    },
  ];

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
              {view === "front" ? "境外停留分析" : "口岸概览"}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {showFuture && view === "front" && (
              <Badge
                variant="outline"
                title="毕业时间在未来：未来天数不会计入境外/境内占比，仅作为预计剩余展示。"
                className="bg-white/60 text-blue-700 border-blue-200"
              >
                含未来区间
              </Badge>
            )}

            <button
              type="button"
              onClick={() => setView((v) => (v === "front" ? "back" : "front"))}
              className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white/60 px-3 py-2 text-sm text-blue-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-pressed={view === "back"}
              aria-label={
                view === "front" ? "查看口岸概览" : "返回境外停留分析"
              }
            >
              <ArrowLeftRight className="h-4 w-4" />
              {view === "front" ? "查看口岸" : "返回分析"}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {view === "front" ? (
          <>
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
              {eligibilityCards.map((card) => (
                <div
                  key={card.key}
                  className={`rounded-lg p-4 flex items-start gap-3 ${card.containerClassName}`}
                  style={{
                    borderLeft: `4px solid ${card.borderLeftColor}`,
                  }}
                >
                  {card.icon}

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {card.title}
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
                            <div className="font-medium text-slate-900">
                              说明
                            </div>
                            <div className="mt-1 text-slate-600">
                              {card.helpText}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </div>

                      <Badge variant="outline" className={card.badgeClassName}>
                        {card.badgeText}
                      </Badge>
                    </div>

                    {card.body}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-gray-200 bg-white/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    最常去的口岸
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="text-slate-700 border-slate-200"
                >
                  记录数 {result.totalRecords}
                </Badge>
              </div>

              <div className="mt-4 space-y-2">
                {portTop3.length === 0 ? (
                  <div className="text-sm text-slate-600">
                    该时间范围内没有可统计的口岸信息。
                  </div>
                ) : (
                  portTop3.map((item) => (
                    <div
                      key={item.port}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700"
                          aria-hidden="true"
                        >
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {item.port}
                          </div>
                          <div className="text-xs text-slate-500">
                            出现 {item.count} 次
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={[
                          "text-xs",
                          item.rank === 1
                            ? "bg-amber-100/70 text-amber-800 border-amber-300"
                            : item.rank === 2
                              ? "bg-slate-100/70 text-slate-800 border-slate-300"
                              : "bg-orange-100/70 text-orange-800 border-orange-300",
                        ].join(" ")}
                      >
                        TOP {item.rank}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
