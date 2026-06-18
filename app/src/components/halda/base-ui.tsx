"use client";

import { Button } from "@base-ui/react/button";
import { Progress } from "@base-ui/react/progress";
import { Tabs } from "@base-ui/react/tabs";
import { Tooltip } from "@base-ui/react/tooltip";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonTone = "primary" | "secondary" | "quiet" | "outline";
type ButtonSize = "sm" | "md";

interface HaldaButtonProps
  extends Omit<ComponentPropsWithoutRef<typeof Button>, "className"> {
  className?: string;
  tone?: ButtonTone;
  size?: ButtonSize;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const buttonTone: Record<ButtonTone, string> = {
  primary:
    "border-[#17202a] bg-[#17202a] text-[#fffaf0] shadow-[4px_4px_0_#17202a] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#17202a]",
  secondary:
    "border-[#17202a] bg-[#d7eee9] text-[#17202a] shadow-[3px_3px_0_#17202a] hover:-translate-y-0.5",
  quiet:
    "border-transparent bg-transparent text-[#314456] hover:bg-[#ebe5da]",
  outline:
    "border-[#17202a] bg-[#fffaf0] text-[#17202a] shadow-[3px_3px_0_#17202a] hover:-translate-y-0.5 hover:bg-[#f4efdf]",
};

const buttonSize: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
};

export function HaldaButton({
  className,
  tone = "primary",
  size = "md",
  ...props
}: HaldaButtonProps) {
  return (
    <Button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[6px] border-2 font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#2a8c84] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        buttonTone[tone],
        buttonSize[size],
        className,
      )}
      {...props}
    />
  );
}

export interface HaldaTabItem {
  value: string;
  label: string;
  kicker?: string;
  children: ReactNode;
}

export function HaldaTabs({
  items,
  defaultValue,
  className,
}: {
  items: HaldaTabItem[];
  defaultValue?: string;
  className?: string;
}) {
  const firstValue = defaultValue ?? items[0]?.value;

  return (
    <Tabs.Root className={cx("w-full", className)} defaultValue={firstValue}>
      <Tabs.List className="relative grid grid-cols-3 gap-1 rounded-[6px] border-2 border-[#17202a] bg-[#ded8cc] p-1">
        {items.map((item) => (
          <Tabs.Tab
            className="relative z-10 min-h-11 rounded-[4px] border-2 border-transparent px-2 py-2 text-left text-sm font-semibold text-[#536576] outline-none transition hover:bg-[#fffaf0]/70 focus-visible:ring-2 focus-visible:ring-[#2a8c84] data-[selected]:border-[#17202a] data-[selected]:bg-[#fffaf0] data-[selected]:text-[#17202a] data-[selected]:shadow-[2px_2px_0_#17202a]"
            key={item.value}
            value={item.value}
          >
            <span className="block leading-tight">{item.label}</span>
            {item.kicker ? (
              <span className="mt-0.5 block text-[11px] font-normal leading-tight text-[#758694]">
                {item.kicker}
              </span>
            ) : null}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {items.map((item) => (
        <Tabs.Panel
          className="mt-4 outline-none data-[hidden]:hidden"
          key={item.value}
          value={item.value}
        >
          {item.children}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

export function HaldaProgress({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max === 0 ? 0 : (clamped / max) * 100;

  return (
    <Progress.Root
      aria-label={label}
      className={cx("grid gap-2", className)}
      max={max}
      value={clamped}
    >
      <div className="flex items-center justify-between gap-3 text-xs text-[#596673]">
        <Progress.Label className="font-medium">{label}</Progress.Label>
        <Progress.Value className="font-bold text-[#17202a]" />
      </div>
      <Progress.Track className="h-3 overflow-hidden rounded-[3px] border-2 border-[#17202a] bg-[#d8d2c6]">
        <Progress.Indicator
          className="block h-full bg-[#2a8c84] transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </Progress.Track>
    </Progress.Root>
  );
}

export function HaldaTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip.Provider closeDelay={80} delay={250}>
      <Tooltip.Root>
        <Tooltip.Trigger className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border-2 border-[#17202a] bg-[#fffaf0] text-xs font-bold text-[#17202a] outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#2a8c84]">
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" sideOffset={8}>
            <Tooltip.Popup className="max-w-64 rounded-[6px] border-2 border-[#17202a] bg-[#fffaf0] px-3 py-2 text-xs leading-relaxed text-[#17202a] shadow-[4px_4px_0_#17202a]">
              {label}
              <Tooltip.Arrow className="fill-[#17202a]" />
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
