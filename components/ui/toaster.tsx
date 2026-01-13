"use client";

import * as React from "react";
import { Toaster as InternalToaster } from "@/components/ui/toast";

/**
 * App-level toaster renderer.
 *
 * Usage (once, near the root):
 * - Add `<Toaster />` in `app/layout.tsx` (inside <body>).
 *
 * Then anywhere in client components:
 * - `import { toast } from "@/components/ui/toast";`
 * - `toast({ title: "...", description: "..." })`
 */
export function Toaster(props: { className?: string }) {
  return <InternalToaster className={props.className} />;
}

export default Toaster;
