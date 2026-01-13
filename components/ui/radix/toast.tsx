"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

import { cn } from "@/lib/utils";

/**
 * Radix Toast primitives (unstyled -> Tailwind styled)
 *
 * Intent:
 * - Provide low-level, stable building blocks (Provider/Viewport/Root/etc.)
 * - Provide reusable styling helpers for the legacy `toast()` bridge.
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

type ToastVariant = "default" | "success" | "destructive";

function toastVariantClassName(variant: ToastVariant | undefined) {
  switch (variant) {
    case "success":
      return "border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-900/35 dark:bg-emerald-950/80 dark:text-emerald-50";
    case "destructive":
      return "border-rose-200 bg-rose-50/95 text-rose-950 dark:border-rose-900/35 dark:bg-rose-950/80 dark:text-rose-50";
    default:
      return "border-slate-200 bg-white/95 text-slate-950 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-50";
  }
}

function toastIconClassName(variant: ToastVariant | undefined) {
  switch (variant) {
    case "success":
      return "text-emerald-600 dark:text-emerald-300";
    case "destructive":
      return "text-rose-600 dark:text-rose-300";
    default:
      return "text-slate-600 dark:text-slate-300";
  }
}

function toastBarClassName(variant: ToastVariant | undefined) {
  switch (variant) {
    case "success":
      return "bg-emerald-500/70 dark:bg-emerald-400/60";
    case "destructive":
      return "bg-rose-500/70 dark:bg-rose-400/60";
    default:
      return "bg-slate-500/40 dark:bg-slate-400/30";
  }
}

function ToastSuccessIcon(props: { className?: string }) {
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
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ToastDestructiveIcon(props: { className?: string }) {
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
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86l-8.32 14.4A2 2 0 0 0 3.7 21h16.6a2 2 0 0 0 1.73-2.74l-8.32-14.4a2 2 0 0 0-3.46 0z" />
    </svg>
  );
}

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
  toastVariantClassName,
  toastIconClassName,
  toastBarClassName,
  ToastSuccessIcon,
  ToastDestructiveIcon,
  type ToastVariant,
};
