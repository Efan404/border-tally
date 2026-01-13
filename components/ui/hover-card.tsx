"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "@/lib/utils";

/**
 * HoverCard built on Radix HoverCard.
 *
 * Behavior:
 * - Opens on hover (mouse).
 * - Closes when pointer leaves both trigger and content.
 *
 * Notes:
 * - Radix HoverCard is intended for sighted users and is ignored by screen readers.
 *
 * Usage:
 * <HoverCard openDelayMs={120} closeDelayMs={80}>
 *   <HoverCardTrigger asChild>
 *     <button type="button">?</button>
 *   </HoverCardTrigger>
 *   <HoverCardContent>
 *     Helpful explanation...
 *   </HoverCardContent>
 * </HoverCard>
 */

type HoverCardProps = Omit<
  React.ComponentProps<typeof HoverCardPrimitive.Root>,
  "openDelay" | "closeDelay"
> & {
  openDelayMs?: number;
  closeDelayMs?: number;
};

function HoverCard({
  openDelayMs = 120,
  closeDelayMs = 80,
  ...props
}: HoverCardProps) {
  return (
    <HoverCardPrimitive.Root
      openDelay={openDelayMs}
      closeDelay={closeDelayMs}
      {...props}
    />
  );
}

function HoverCardTrigger(
  props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>,
) {
  return <HoverCardPrimitive.Trigger {...props} />;
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-3 shadow-md outline-hidden",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
