"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogTrigger,
  DialogDrawerContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { parsePDF } from "@/lib/pdf-parser";
import { ParseResult } from "@/types";

interface PDFUploadProps {
  onParseComplete: (result: ParseResult) => void;
}

export function PDFUpload({ onParseComplete }: PDFUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // “成功状态融合”所需：记录数 + 友好的文件名
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [recordCount, setRecordCount] = useState<number | null>(null);

  const openFilePicker = () => {
    // Ensure the hidden input is reset so selecting the same file re-triggers `onChange`
    // across browsers (some will not fire `change` if the same file is picked twice).
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("请上传 PDF 格式的文件");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("文件大小不能超过 10MB");
        return;
      }

      setFileName(file.name);
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      setRecordCount(null);

      try {
        const result = await parsePDF(file);

        if (result.success) {
          setSuccess(true);
          setRecordCount(result.records.length);
          onParseComplete(result);
        } else {
          setError(result.error || "解析失败，请确保上传的是有效的出入境记录");
        }
      } catch {
        setError("文件处理失败，请重试");
      } finally {
        setIsLoading(false);
      }
    },
    [onParseComplete],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await processFile(files[0]);
      }
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await processFile(files[0]);
        // 允许用户选择同一个文件时也能触发 onChange
        e.target.value = "";
      }
    },
    [processFile],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          上传出入境记录
          {/* Desktop: HoverCard (quick preview) */}
          <div className="hidden sm:block">
            <HoverCard openDelayMs={120} closeDelayMs={120}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  aria-label="如何下载出入境记录 PDF"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </HoverCardTrigger>

              <HoverCardContent
                align="start"
                className="w-80 text-xs leading-relaxed"
              >
                <div className="font-medium text-slate-900">
                  如何下载出入境记录（PDF）
                </div>
                <div className="mt-2 space-y-2 text-slate-700">
                  <div className="flex gap-2">
                    <div className="mt-0.5 text-slate-500">1.</div>
                    <div>微信/支付宝 搜索 “出入境记录查询”</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="mt-0.5 text-slate-500">2.</div>
                    <div>填写身份信息并人脸识别登录</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="mt-0.5 text-slate-500">3.</div>
                    <div>选择查询人以及查询的时间范围</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="mt-0.5 text-slate-500">4.</div>
                    <div>下载查询结果（建议选择第一个：本地下载）</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="mt-0.5 text-slate-500">5.</div>
                    <div>将下载好的 PDF 文件上传</div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500">
                    提示：本网站仅在本地解析 PDF，不会上传到服务器。
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          {/* Mobile: Drawer-like Dialog (better for long content & tapping) */}
          <div className="sm:hidden">
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  aria-label="如何下载出入境记录 PDF"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </DialogTrigger>

              <DialogDrawerContent side="bottom" className="p-0">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <DialogTitle className="text-base">
                    如何下载出入境记录（PDF）
                  </DialogTitle>

                  <DialogClose asChild>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      aria-label="关闭"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogClose>
                </div>

                <div className="max-h-[70vh] overflow-auto px-5 py-4 text-sm text-slate-700">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="mt-0.5 text-slate-500">1.</div>
                      <div>微信/支付宝 搜索 “出入境记录查询”</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="mt-0.5 text-slate-500">2.</div>
                      <div>填写身份信息并人脸识别登录</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="mt-0.5 text-slate-500">3.</div>
                      <div>选择查询人以及查询的时间范围</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="mt-0.5 text-slate-500">4.</div>
                      <div>下载查询结果（建议选择第一个：本地下载）</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="mt-0.5 text-slate-500">5.</div>
                      <div>将下载好的 PDF 文件上传</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    提示：本网站仅在本地解析 PDF，不会上传到服务器。
                  </div>
                </div>
              </DialogDrawerContent>
            </Dialog>
          </div>
        </CardTitle>
        <CardDescription>支持国家移民管理局导出的 PDF 文件</CardDescription>
      </CardHeader>

      <CardContent>
        <div
          onClick={() => {
            if (!isLoading) openFilePicker();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 transition-colors
            ${success ? "border-green-300 bg-green-50/60" : ""}
            ${!success && isDragging ? "border-primary bg-primary/5" : ""}
            ${!success && !isDragging ? "border-gray-200 hover:border-primary/50" : ""}
            ${error ? "border-destructive/50 bg-destructive/5" : ""}
            ${isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
          `}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!isLoading) openFilePicker();
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            // Avoid the input receiving the click itself; we open picker from the container.
            // This prevents double-trigger / needing to pick twice in some browsers.
            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
            disabled={isLoading}
            tabIndex={-1}
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">正在解析文件...</p>
            </div>
          ) : success ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      解析完成，已提取 {recordCount ?? 0} 条记录
                    </p>
                    {fileName && (
                      <p className="text-xs text-green-700/80 mt-1">
                        已选择文件：{fileName}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white/60 border-green-200 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFilePicker();
                  }}
                >
                  替换文件
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm">点击或拖拽 PDF 文件到此处</p>
              <p className="text-xs text-muted-foreground">
                支持 PDF 格式，最大 10MB
              </p>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
