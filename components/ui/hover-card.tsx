"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

/**
 * Lightweight HoverCard built on Radix Popover.
 *
 * Why Popover?
 * - This project already uses Radix Popover and has styling conventions for it.
 *
 * Behavior:
 * - Opens on hover (mouse) and on focus (keyboard).
 * - Closes on mouse leave and blur.
 *
 * Usage:
 * <HoverCard>
 *   <HoverCardTrigger asChild>
 *     <button type="button">?</button>
 *   </HoverCardTrigger>
 *   <HoverCardContent>
 *     Helpful explanation...
 *   </HoverCardContent>
 * </HoverCard>
 */

type HoverCardProps = React.ComponentProps<typeof PopoverPrimitive.Root> & {
  openDelayMs?: number;
  closeDelayMs?: number;
};

function HoverCard({
  open: openProp,
  defaultOpen,
  onOpenChange,
  openDelayMs = 120,
  closeDelayMs = 80,
  ...props
}: HoverCardProps) {
  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false,
  );

  const open = isControlled ? openProp : uncontrolledOpen;

  const openTimerRef = React.useRef<number | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const clearTimers = React.useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const scheduleOpen = React.useCallback(() => {
    clearTimers();
    openTimerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, openDelayMs);
  }, [clearTimers, openDelayMs, setOpen]);

  const scheduleClose = React.useCallback(() => {
    clearTimers();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, closeDelayMs);
  }, [clearTimers, closeDelayMs, setOpen]);

  // Provide hover/focus controls to subcomponents via context.
  const ctx = React.useMemo(
    () => ({
      open,
      scheduleOpen,
      scheduleClose,
    }),
    [open, scheduleOpen, scheduleClose],
  );

  return (
    <HoverCardContext.Provider value={ctx}>
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          // If something else toggles it (e.g. Escape), keep internal state synced.
          clearTimers();
          setOpen(next);
        }}
        {...props}
      />
    </HoverCardContext.Provider>
  );
}

type HoverCardContextValue = {
  open: boolean;
  scheduleOpen: () => void;
  scheduleClose: () => void;
};

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

function useHoverCardContext() {
  const ctx = React.useContext(HoverCardContext);
  if (!ctx) {
    throw new Error(
      "HoverCard components must be used within <HoverCard>...</HoverCard>",
    );
  }
  return ctx;
}

function HoverCardTrigger({
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  const { scheduleOpen, scheduleClose } = useHoverCardContext();

  return (
    <PopoverPrimitive.Trigger
      {...props}
      onMouseEnter={(e) => {
        scheduleOpen();
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        scheduleClose();
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        scheduleOpen();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        scheduleClose();
        onBlur?.(e);
      }}
    />
  );
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 6,
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const { scheduleOpen, scheduleClose } = useHoverCardContext();

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-3 shadow-md outline-hidden",
          className,
        )}
        onMouseEnter={(e) => {
          // keep open when hovering content
          scheduleOpen();
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          scheduleClose();
          onMouseLeave?.(e);
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
