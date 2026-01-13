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
  toastVariantClassName,
  toastIconClassName,
  toastBarClassName,
  ToastSuccessIcon,
  ToastDestructiveIcon,
  type ToastVariant,
} from "@/components/ui/radix/toast";
import { cn } from "@/lib/utils";

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
      ? ToastSuccessIcon
      : item.variant === "destructive"
        ? ToastDestructiveIcon
        : null;

  return (
    <RadixToast
      open
      duration={item.durationMs}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
      className={cn(toastVariantClassName(item.variant))}
    >
      {/* Left accent bar */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          toastBarClassName(item.variant),
        )}
      />

      <RadixToastRow className="p-4">
        {Icon ? (
          <div className="pt-0.5">
            <Icon className={cn("h-5 w-5", toastIconClassName(item.variant))} />
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
