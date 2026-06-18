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
    "border-transparent bg-[#193247] text-white shadow-[0_10px_24px_rgba(25,50,71,0.16)] hover:bg-[#102739]",
  secondary:
    "border-transparent bg-[#e7f4f1] text-[#113c3b] hover:bg-[#d7eee9]",
  quiet:
    "border-transparent bg-transparent text-[#314456] hover:bg-[#edf3f3]",
  outline:
    "border-[#cad8dc] bg-white text-[#193247] hover:border-[#9db6bd] hover:bg-[#f7fbfb]",
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
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#2a8c84] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
      <Tabs.List className="relative grid grid-cols-3 gap-1 rounded-lg border border-[#d9e4e6] bg-[#edf4f4] p-1">
        {items.map((item) => (
          <Tabs.Tab
            className="relative z-10 min-h-11 rounded-md px-2 py-2 text-left text-sm font-medium text-[#536576] outline-none transition hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-[#2a8c84] data-[selected]:bg-white data-[selected]:text-[#172637] data-[selected]:shadow-sm"
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
      <div className="flex items-center justify-between gap-3 text-xs text-[#607283]">
        <Progress.Label className="font-medium">{label}</Progress.Label>
        <Progress.Value className="font-semibold text-[#193247]" />
      </div>
      <Progress.Track className="h-2 overflow-hidden rounded-full bg-[#dbe8e8]">
        <Progress.Indicator
          className="block h-full rounded-full bg-[#2a8c84] transition-[width] duration-500 ease-out"
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
        <Tooltip.Trigger className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d9e4e6] bg-white text-xs font-semibold text-[#607283] outline-none transition hover:border-[#9db6bd] hover:text-[#193247] focus-visible:ring-2 focus-visible:ring-[#2a8c84]">
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" sideOffset={8}>
            <Tooltip.Popup className="max-w-64 rounded-md bg-[#172637] px-3 py-2 text-xs leading-relaxed text-white shadow-xl">
              {label}
              <Tooltip.Arrow className="fill-[#172637]" />
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
