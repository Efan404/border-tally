"use client";

/**
 * Toast system for this project.
 *
 * Goals:
 * - Keep the existing `toast({ ... })` and `useToast()` API unchanged.
 * - Render notifications via Radix Toast (stable, accessible state machine).
 *
 * Usage:
 * 1) Add once near the root (e.g. `app/layout.tsx`):
 *    <Toaster />
 *
 * 2) In any client component:
 *    import { toast } from "@/components/ui/toast";
 *    toast({ title: "已复制链接", description: "可以分享给其他人了" });
 */

import * as React from "react";
import {
  ToastProvider as RadixToastProvider,
  ToastViewport as RadixToastViewport,
  Toast as RadixToast,
  ToastBody as RadixToastBody,
  ToastRow as RadixToastRow,
  ToastTitle as RadixToastTitle,
  ToastDescription as RadixToastDescription,
  ToastAction as RadixToastAction,
  ToastClose as RadixToastClose,
} from "@/components/ui/radix/toast";

import { cn } from "@/lib/utils";

function variantClassName(variant: ToastVariant | undefined) {
  switch (variant) {
    case "success":
      return "border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-900/35 dark:bg-emerald-950/80 dark:text-emerald-50";
    case "destructive":
      return "border-rose-200 bg-rose-50/95 text-rose-950 dark:border-rose-900/35 dark:bg-rose-950/80 dark:text-rose-50";
    default:
      return "border-slate-200 bg-white/95 text-slate-950 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-50";
  }
}

function iconClassName(variant: ToastVariant | undefined) {
  switch (variant) {
    case "success":
      return "text-emerald-600 dark:text-emerald-300";
    case "destructive":
      return "text-rose-600 dark:text-rose-300";
    default:
      return "text-slate-600 dark:text-slate-300";
  }
}

function barClassName(variant: ToastVariant | undefined) {
  switch (variant) {
    case "success":
      return "bg-emerald-500/70 dark:bg-emerald-400/60";
    case "destructive":
      return "bg-rose-500/70 dark:bg-rose-400/60";
    default:
      return "bg-slate-500/40 dark:bg-slate-400/30";
  }
}

function CheckIcon(props: { className?: string }) {
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

function AlertIcon(props: { className?: string }) {
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

type ToastVariant = "default" | "success" | "destructive";

export type ToastOptions = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  durationMs?: number; // auto dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
};

export type ToastHandle = {
  id: string;
  dismiss: () => void;
};

type ToastItem = Required<Pick<ToastOptions, "id">> &
  Omit<ToastOptions, "id"> & {
    createdAt: number;
  };

type ToastState = {
  toasts: ToastItem[];
};

type ToastAction =
  | { type: "ADD"; toast: ToastItem }
  | { type: "DISMISS"; id?: string }
  | { type: "REMOVE"; id: string };

const TOAST_LIMIT = 3;

function genId() {
  // Avoid crypto dependency; good enough for UI notification IDs.
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD": {
      const next = [action.toast, ...state.toasts];
      return { toasts: next.slice(0, TOAST_LIMIT) };
    }
    case "DISMISS": {
      if (!action.id) {
        // Dismiss all: mark for removal by filtering in remove, or just clear.
        return { toasts: [] };
      }
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    }
    case "REMOVE": {
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    }
    default:
      return state;
  }
}

/**
 * Simple global store so any component can call `useToast` without context wiring.
 * (Pattern similar to shadcn/ui toast.)
 */
let memoryState: ToastState = { toasts: [] };
const listeners = new Set<(s: ToastState) => void>();

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action);
  for (const l of listeners) l(memoryState);
}

function scheduleAutoDismiss(id: string, durationMs: number) {
  window.setTimeout(() => {
    dispatch({ type: "REMOVE", id });
  }, durationMs);
}

export function toast(opts: ToastOptions): ToastHandle {
  const id = opts.id ?? genId();
  const durationMs =
    typeof opts.durationMs === "number" ? opts.durationMs : 2600;

  const item: ToastItem = {
    id,
    title: opts.title,
    description: opts.description,
    variant: opts.variant ?? "default",
    durationMs,
    action: opts.action,
    createdAt: Date.now(),
  };

  dispatch({ type: "ADD", toast: item });

  // Auto dismiss; if duration is 0 or negative, keep until manual dismiss.
  if (durationMs > 0) scheduleAutoDismiss(id, durationMs);

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS", id }),
  };
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    const l = (s: ToastState) => setState(s);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss: (id?: string) => dispatch({ type: "DISMISS", id }),
  };
}

/* -------------------------------------------------------------------------------------------------
 * UI pieces (rendered via Radix Toast)
 * ------------------------------------------------------------------------------------------------- */

function ToastRow(props: { item: ToastItem; onDismiss: () => void }) {
  const { item, onDismiss } = props;

  const Icon =
    item.variant === "success"
      ? CheckIcon
      : item.variant === "destructive"
        ? AlertIcon
        : null;

  return (
    <RadixToast
      open
      duration={item.durationMs}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
      className={cn(variantClassName(item.variant))}
    >
      {/* Left accent bar */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          barClassName(item.variant),
        )}
      />

      <RadixToastRow className="p-4">
        {Icon ? (
          <div className="pt-0.5">
            <Icon className={cn("h-5 w-5", iconClassName(item.variant))} />
          </div>
        ) : null}

        <RadixToastBody>
          {item.title ? <RadixToastTitle>{item.title}</RadixToastTitle> : null}
          {item.description ? (
            <RadixToastDescription className="mt-1 text-slate-700 dark:text-slate-200">
              {item.description}
            </RadixToastDescription>
          ) : null}

          {item.action ? (
            <div className="mt-3">
              <RadixToastAction
                altText={item.action.label}
                onClick={() => {
                  item.action?.onClick?.();
                  onDismiss();
                }}
                className={cn(
                  "h-auto px-3 py-1.5 text-sm",
                  "border border-slate-200 bg-white/70 hover:bg-white",
                  "dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-900",
                )}
              >
                {item.action.label}
              </RadixToastAction>
            </div>
          ) : null}
        </RadixToastBody>

        <RadixToastClose />
      </RadixToastRow>
    </RadixToast>
  );
}

export function Toaster(props: { className?: string }) {
  const { toasts, dismiss } = useToast();

  return (
    <RadixToastProvider>
      <RadixToastViewport className={props.className} />
      {toasts.map((t) => (
        <ToastRow key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </RadixToastProvider>
  );
}
