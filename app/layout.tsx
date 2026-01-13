import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "出入境记录分析 - Border Tally",
  description: "上传出入境记录PDF，快速计算境外停留天数",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased font-sans">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
