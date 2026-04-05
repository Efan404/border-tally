"use client";

import { useMemo, useRef, useState } from "react";
import { PDFUpload } from "@/components/pdf-upload";
import { DateRangePicker } from "@/components/date-range-picker";
import { ResultCard } from "@/components/result-card";
import { ParseResult, DataValidationResult } from "@/types";
import { calculateOverseasDays } from "@/lib/border-calculation";
import { correctDocumentMatching } from "@/lib/data-correction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  ArrowRight,
  Info,
  User,
  AlertTriangle,
  AlertCircle,
  Github,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { ResultActions } from "@/components/result-actions";

type StudentCategory = "hkm" | "overseas";

function getDocFilterForCategory(category: StudentCategory) {
  // 注意：这里用“包含关键词”匹配，避免 PDFs 中证件名存在前后缀/空格差异
  // 1) 港澳留学生：只统计 往来港澳通行证
  // 2) 海外留学生：只统计 普通护照
  if (category === "hkm") {
    return (docName: string) => docName.includes("往来港澳通行证");
  }
  return (docName: string) => docName.includes("普通护照");
}

export default function Home() {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [validationResult, setValidationResult] =
    useState<DataValidationResult | null>(null);

  // Used for exporting the result card as an image
  const exportCardRef = useRef<HTMLDivElement | null>(null);

  // 互斥选项：先选类别，再选时间范围
  const [studentCategory, setStudentCategory] =
    useState<StudentCategory>("hkm");

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const docFilter = useMemo(
    () => getDocFilterForCategory(studentCategory),
    [studentCategory],
  );

  // 在时间范围计算之前，根据互斥选项过滤 record（避免不同证件记录混在一起导致错配）
  const filteredRecords = useMemo(() => {
    if (!parseResult?.success) return [];
    return parseResult.records.filter((r) => docFilter(r.documentName));
  }, [parseResult, docFilter]);

  /**
   * 动态区间分段（毕业时间可能在未来）
   * - 已发生区间：[from, min(to, todayCST)]
   * - 未来区间：[tomorrowCST, to]（当 to 在未来时存在；“从明天到毕业(含毕业)”）
   *
   * 说明：这里的 today/tomorrow 以本地日历日为准（页面仅用于展示与分段控制）。
   * 境外天数的 timezone 语义仍由 calculateOverseasDays 内部统一到 CST date-only 处理。
   */
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);

  const effectiveTo = dateRange?.to;

  const pastTo = useMemo(() => {
    if (!dateRange?.from || !effectiveTo) return undefined;

    const t = effectiveTo.getTime() < today.getTime() ? effectiveTo : today;
    return t.getTime() < dateRange.from.getTime() ? undefined : t;
  }, [dateRange, effectiveTo, today]);

  const hasFuture = useMemo(() => {
    if (!dateRange?.to) return false;
    return dateRange.to.getTime() > today.getTime();
  }, [dateRange, today]);

  const calculationResult = useMemo(() => {
    if (!dateRange?.from || !pastTo) return null;
    return calculateOverseasDays(filteredRecords, dateRange.from, pastTo);
  }, [filteredRecords, dateRange, pastTo]);

  // 仅在“已发生区间存在且计算成功”时展示结果
  const showResult = !!(calculationResult && dateRange?.from && dateRange?.to);

  // 未来天数：从明天到毕业(含毕业)
  const futureDays = useMemo(() => {
    if (!dateRange?.to || !hasFuture) return 0;
    const start =
      tomorrow.getTime() > dateRange.to.getTime() ? undefined : tomorrow;
    if (!start) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    const a = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    ).getTime();
    const b = new Date(
      dateRange.to.getFullYear(),
      dateRange.to.getMonth(),
      dateRange.to.getDate(),
    ).getTime();
    return b < a ? 0 : Math.floor((b - a) / msPerDay) + 1;
  }, [dateRange, hasFuture, tomorrow]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        <div className="mb-12">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🌍 留学生出入境天数计算器
              </h1>
              {/*<p className="text-lg text-gray-600 max-w-2xl mx-auto">
                上传您的出入境记录，选择时间范围，快速计算境外停留天数
              </p>*/}
            </div>

            <Button
              type="button"
              variant="outline"
              className="bg-white/60"
              onClick={() => {
                window.open(
                  "https://github.com/Efan404/border-tally",
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <Github className="h-4 w-4" />
              GitHub
            </Button>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 ${parseResult ? "text-primary" : "text-gray-400"}`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">上传文件</span>
            </div>

            <ArrowRight className="h-4 w-4 text-gray-300" />

            <div
              className={`flex items-center gap-2 ${parseResult?.success ? "text-primary" : "text-gray-400"}`}
            >
              <User className="h-5 w-5" />
              <span className="text-sm font-medium">选择身份</span>
            </div>

            <ArrowRight className="h-4 w-4 text-gray-300" />

            <div
              className={`flex items-center gap-2 ${dateRange?.from && dateRange?.to ? "text-primary" : "text-gray-400"}`}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">选择时间</span>
            </div>

            <ArrowRight className="h-4 w-4 text-gray-300" />

            <div
              className={`flex items-center gap-2 ${showResult ? "text-primary" : "text-gray-400"}`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">查看结果</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <PDFUpload
            onParseComplete={(r) => {
              if (r.success) {
                // 执行证件修正和数据验证
                const validated = correctDocumentMatching(r.records);
                setValidationResult(validated);
                setParseResult({ ...r, records: validated.correctedRecords });
              } else {
                setParseResult(r);
                setValidationResult(null);
              }
              // 更换文件后，重置时间范围，避免沿用旧范围导致"已计算"但其实不匹配新数据
              setDateRange(undefined);
            }}
          />
        </div>

        {validationResult &&
          validationResult.issues.length > 0 &&
          parseResult?.success && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-5 w-5" />
                    数据检查结果
                  </CardTitle>
                  <CardDescription>
                    {validationResult.correctedCount > 0 && (
                      <span className="text-orange-700">
                        已自动修正 {validationResult.correctedCount}{" "}
                        条记录的证件信息
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {validationResult.issues.map((issue, idx) => (
                      <Alert
                        key={idx}
                        className={
                          issue.severity === "warning"
                            ? "border-orange-300 bg-orange-50"
                            : "border-blue-300 bg-blue-50"
                        }
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium text-sm">
                            {issue.message}
                          </div>
                          {issue.suggestion && (
                            <div className="text-xs mt-1 text-muted-foreground">
                              💡 {issue.suggestion}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        <div className="mb-6">
          <Card className={!parseResult?.success ? "opacity-50" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                留学身份类型
              </CardTitle>
              <CardDescription>请选择计算依据</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!parseResult?.success}
                  onClick={() => {
                    setStudentCategory("hkm");
                    setDateRange(undefined);
                  }}
                  className={[
                    "group w-full rounded-xl border p-4 text-left transition-all",
                    "bg-white/40 hover:bg-white/60 active:scale-[0.99]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                    !parseResult?.success
                      ? "cursor-not-allowed opacity-60"
                      : "",
                    studentCategory === "hkm"
                      ? "border-blue-400 bg-blue-50/80 shadow-md ring-1 ring-blue-300/60"
                      : "border-blue-200/60 hover:border-blue-300/70",
                  ].join(" ")}
                  aria-pressed={studentCategory === "hkm"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">🇭🇰</span>
                        <span className="text-sm font-semibold text-slate-900">
                          港澳地区
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        基于《往来港澳通行证》计算
                      </div>
                    </div>

                    <div
                      className={[
                        "mt-0.5 h-5 w-5 rounded-full border",
                        studentCategory === "hkm"
                          ? "border-blue-500 bg-blue-500"
                          : "border-slate-300 bg-white",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      <div
                        className={[
                          "h-full w-full rounded-full",
                          studentCategory === "hkm"
                            ? "scale-50 bg-white"
                            : "scale-0",
                          "transition-transform",
                        ].join(" ")}
                      />
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!parseResult?.success}
                  onClick={() => {
                    setStudentCategory("overseas");
                    setDateRange(undefined);
                  }}
                  className={[
                    "group w-full rounded-xl border p-4 text-left transition-all",
                    "bg-white/40 hover:bg-white/60 active:scale-[0.99]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                    !parseResult?.success
                      ? "cursor-not-allowed opacity-60"
                      : "",
                    studentCategory === "overseas"
                      ? "border-blue-400 bg-blue-50/80 shadow-md ring-1 ring-blue-300/60"
                      : "border-blue-200/60 hover:border-blue-300/70",
                  ].join(" ")}
                  aria-pressed={studentCategory === "overseas"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">🌍</span>
                        <span className="text-sm font-semibold text-slate-900">
                          海外国家
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        基于《普通护照》计算
                      </div>
                    </div>

                    <div
                      className={[
                        "mt-0.5 h-5 w-5 rounded-full border",
                        studentCategory === "overseas"
                          ? "border-blue-500 bg-blue-500"
                          : "border-slate-300 bg-white",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      <div
                        className={[
                          "h-full w-full rounded-full",
                          studentCategory === "overseas"
                            ? "scale-50 bg-white"
                            : "scale-0",
                          "transition-transform",
                        ].join(" ")}
                      />
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <DateRangePicker
            date={dateRange}
            onDateChange={setDateRange}
            disabled={!parseResult?.success}
          />
        </div>

        {showResult &&
          calculationResult &&
          dateRange?.from &&
          dateRange?.to && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div ref={exportCardRef}>
                <ResultCard
                  result={calculationResult}
                  dateRange={{ from: dateRange.from, to: dateRange.to }}
                  futureDays={futureDays}
                />
              </div>

              <ResultActions exportTargetRef={exportCardRef} />
            </div>
          )}

        <div className="mt-12 flex flex-col items-center gap-4">
          {/*<div className="text-sm text-gray-500">支持我继续维护这个小工具</div>*/}

          <a
            href="https://ko-fi.com/D1D81SN76C"
            target="_blank"
            rel="noreferrer"
          >
            <img
              height="36"
              style={{ border: 0, height: 36 }}
              src="https://storage.ko-fi.com/cdn/kofi5.png?v=6"
              alt="Buy Me a Coffee at ko-fi.com"
            />
          </a>

          <div className="text-center text-sm text-gray-500">
            <a
              href="https://efan404.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-700 hover:underline"
            >
              @efan404
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
