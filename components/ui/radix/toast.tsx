"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

import { cn } from "@/lib/utils";

/**
 * Radix Toast primitives (unstyled -> Tailwind styled)
 *
 * Intent:
 * - Provide low-level, stable building blocks (Provider/Viewport/Root/etc.)
 * - Allow gradual migration from the legacy toast store without changing UI styling everywhere.
 *
 * Usage (low-level):
 * <ToastProvider>
 *   <ToastViewport />
 *   <Toast open={...} onOpenChange={...}>
 *     <ToastTitle>...</ToastTitle>
 *     <ToastDescription>...</ToastDescription>
 *     <ToastClose />
 *   </Toast>
 * </ToastProvider>
 */

function ToastProvider(
  props: React.ComponentProps<typeof ToastPrimitive.Provider>,
) {
  return <ToastPrimitive.Provider data-slot="toast-provider" {...props} />;
}

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        // Positioning
        "fixed z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4",
        // Mobile: bottom
        "bottom-0 left-0 right-0",
        // Desktop: top-right
        "sm:bottom-auto sm:right-0 sm:top-0 sm:left-auto sm:flex-col sm:max-w-sm",
        // Prevent accidental selection while swiping
        "select-none",
        className,
      )}
      {...props}
    />
  );
}

function Toast({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        // Base
        "pointer-events-auto relative w-full overflow-hidden rounded-xl border shadow-lg",
        // Backdrop / surface
        "bg-white/95 text-slate-950 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        "dark:bg-slate-950/80 dark:text-slate-50 dark:supports-[backdrop-filter]:bg-slate-950/60",
        "border-slate-200 dark:border-slate-800",
        // Layout
        "p-4",
        // Animation (Radix data-state)
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        // Swipe (Radix data-swipe)
        "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=cancel]:translate-x-0",
        "data-[swipe=end]:animate-out data-[swipe=end]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-semibold leading-none", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-slate-600 dark:text-slate-300", className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md px-3 text-xs font-medium",
        "border border-slate-200 bg-white/60 text-slate-900 hover:bg-white",
        "dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-50 dark:hover:bg-slate-950/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function ToastClose({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      className={cn(
        "absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md",
        "text-slate-500 hover:text-slate-900 hover:bg-slate-100/70",
        "dark:text-slate-300 dark:hover:text-slate-50 dark:hover:bg-slate-800/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      <span className="sr-only">Close</span>
      <CloseIcon className="h-4 w-4" />
    </ToastPrimitive.Close>
  );
}

/**
 * Optional helper region layout for typical toast content:
 * Title + Description on left, optional actions on right.
 */
function ToastBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="toast-body"
      className={cn("grid gap-1 pr-10", className)}
      {...props}
    />
  );
}

function ToastRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="toast-row"
      className={cn("flex items-start gap-3", className)}
      {...props}
    />
  );
}

function ToastActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="toast-actions"
      className={cn("mt-3 flex items-center gap-2", className)}
      {...props}
    />
  );
}

function CloseIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  ToastBody,
  ToastRow,
  ToastActions,
};
