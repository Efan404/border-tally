"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  X,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

  // "成功状态融合"所需：记录数 + 友好的文件名
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [recordCount, setRecordCount] = useState<number | null>(null);

  // MinerU 相关状态
  const [useMinerU, setUseMinerU] = useState(false);
  const [showMinerUConfirm, setShowMinerUConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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

      // 如果开启了 MinerU，先显示确认对话框
      if (useMinerU) {
        setPendingFile(file);
        setShowMinerUConfirm(true);
        return;
      }

      await doParseFile(file, false);
    },
    [useMinerU]
  );

  const doParseFile = async (file: File, enableCrossValidation: boolean) => {
    setFileName(file.name);
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setRecordCount(null);

    try {
      const result = await parsePDF(file, {
        enableCrossValidation,
      });

      if (result.success) {
        setSuccess(true);
        setRecordCount(result.records.length);
        onParseComplete(result);

        // 如果有警告，显示给用户
        if (result.warning) {
          console.warn("[PDF Upload] Parse warning:", result.warning);
        }
      } else {
        setError(result.error || "解析失败，请确保上传的是有效的出入境记录");
      }
    } catch {
      setError("文件处理失败，请重试");
    } finally {
      setIsLoading(false);
      setPendingFile(null);
      setShowMinerUConfirm(false);
    }
  };

  const handleMinerUConfirm = () => {
    if (pendingFile) {
      doParseFile(pendingFile, true);
    }
  };

  const handleMinerUCancel = () => {
    setShowMinerUConfirm(false);
    setPendingFile(null);
    // 取消时自动关闭 MinerU 选项
    setUseMinerU(false);
  };

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
    [processFile]
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
    [processFile]
  );

  // 隐私提示文案
  const PrivacyTooltip = () => (
    <div className="space-y-2">
      <div className="font-medium text-slate-900">隐私保护说明</div>
      <div className="space-y-1.5 text-slate-700">
        <p className="flex items-start gap-2">
          <Shield className="h-3.5 w-3.5 mt-0.5 text-green-600 flex-shrink-0" />
          <span>
            <strong>本地解析模式（默认）</strong>
            <br />
            所有数据仅在本地浏览器中解析，不会上传到任何服务器
          </span>
        </p>
        <p className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
          <span>
            <strong>增强解析模式</strong>
            <br />
            使用 MinerU API 辅助解析，PDF 内容会被上传至 MinerU 服务器处理
          </span>
        </p>
      </div>
    </div>
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
                    <div>微信/支付宝 搜索 "出入境记录查询"</div>
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

                  <div className="pt-2 border-t border-slate-200 mt-2">
                    <PrivacyTooltip />
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
                      <div>微信/支付宝 搜索 "出入境记录查询"</div>
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

                  <div className="mt-4 rounded-md bg-slate-50 px-3 py-3 text-xs text-slate-600">
                    <PrivacyTooltip />
                  </div>
                </div>
              </DialogDrawerContent>
            </Dialog>
          </div>
        </CardTitle>
        <CardDescription>支持国家移民管理局导出的 PDF 文件</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* MinerU 选项 */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="use-mineru"
              checked={useMinerU}
              onCheckedChange={(checked) => setUseMinerU(checked as boolean)}
              disabled={isLoading}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="use-mineru"
                className="text-sm font-medium text-slate-700 cursor-pointer"
              >
                使用增强解析（MinerU）
              </Label>
              <p className="text-xs text-slate-500">
                可提高复杂格式 PDF 的识别准确率，解析时间约 10-60 秒
              </p>
            </div>
          </div>
        </div>

        {/* 隐私提示 */}
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            useMinerU
              ? "border-amber-200 bg-amber-50/50 text-amber-800"
              : "border-green-200 bg-green-50/50 text-green-800"
          }`}
        >
          <div className="flex items-start gap-2">
            {useMinerU ? (
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            ) : (
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
            )}
            <span>
              {useMinerU
                ? "增强解析模式：PDF 内容将被上传至 MinerU 服务器处理，确认后继续"
                : "本地解析模式：所有数据仅在浏览器本地处理，不会上传到任何服务器"}
            </span>
          </div>
        </div>

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
              <p className="text-sm text-muted-foreground">
                {useMinerU ? "正在使用增强解析，请稍候..." : "正在解析文件..."}
              </p>
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

      {/* MinerU 确认对话框 */}
      <Dialog open={showMinerUConfirm} onOpenChange={setShowMinerUConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              确认使用增强解析？
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <span className="block">
                增强解析会将您的 PDF 文件上传至{" "}
                <a
                  href="https://mineru.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 hover:underline"
                >
                  MinerU
                  <ExternalLink className="h-3 w-3" />
                </a>{" "}
                服务器进行处理。
              </span>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <div className="font-medium mb-1">请注意：</div>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>您的出入境记录数据将被上传到第三方服务器</li>
                  <li>解析过程需要 10-60 秒，请耐心等待</li>
                  <li>如担心隐私问题，请取消并使用本地解析模式</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row sm:flex-row gap-2">
            <Button variant="outline" onClick={handleMinerUCancel} className="flex-1">
              取消，使用本地解析
            </Button>
            <Button onClick={handleMinerUConfirm} className="flex-1">
              确认上传并解析
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
