"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { SaveIcon, Share2 } from "lucide-react";

type ResultActionsProps = {
  /**
   * Ref to the DOM element you want to export as an image.
   * Typically the ResultCard wrapper element (card "本体") and NOT the action bar.
   */
  exportTargetRef: React.RefObject<HTMLElement | null>;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTodayYYYYMMDD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getDomainOnly(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

async function copyTextToClipboard(text: string) {
  // Modern API
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "true");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);

  if (!ok) {
    throw new Error("execCommand copy failed");
  }
}

async function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ResultActions(props: ResultActionsProps) {
  const { exportTargetRef } = props;

  const [isExporting, setIsExporting] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);

  const onExport = React.useCallback(async () => {
    if (isExporting) return;

    const target = exportTargetRef.current;
    if (!target) {
      toast({
        variant: "destructive",
        title: "导出失败",
        description: "未找到可导出的结果卡片区域。",
      });
      return;
    }

    setIsExporting(true);
    try {
      const { toPng } = await import("html-to-image");

      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      // Convert data URL to blob and download
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const fileName = `border-tally_${formatTodayYYYYMMDD()}.png`;
      await downloadBlob(blob, fileName);

      toast({
        variant: "success",
        title: "已导出 PNG",
        description: `已保存为 ${fileName}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "导出失败",
        description:
          error instanceof Error ? error.message : "请重试，或更换浏览器。",
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportTargetRef, isExporting]);

  const onShare = React.useCallback(async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      const domain = getDomainOnly();
      if (!domain) {
        throw new Error("no domain available");
      }

      await copyTextToClipboard(domain);

      toast({
        variant: "success",
        title: "已复制链接",
        description: "可以把网站链接分享给其他人了。",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: "请手动复制地址栏中的域名后分享。",
      });
    } finally {
      setIsSharing(false);
    }
  }, [isSharing]);

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
      <Button
        type="button"
        onClick={onExport}
        disabled={isExporting}
        variant="ghost"
        className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      >
        <SaveIcon className="w-4 h-4" />
        {isExporting ? "导出中…" : "导出结果"}
      </Button>

      <Button
        type="button"
        onClick={onShare}
        disabled={isSharing}
        variant="ghost"
        className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      >
        <Share2 className="w-4 h-4" />
        {isSharing ? "复制中…" : "分享网站"}
      </Button>
    </div>
  );
}

export default ResultActions;
