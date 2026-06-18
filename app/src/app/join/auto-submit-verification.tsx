"use client";

import { useEffect, useState } from "react";

export function AutoSubmitVerification({
  code,
  formId,
}: {
  code: string;
  formId: string;
}) {
  const [status, setStatus] = useState<"typing" | "verified" | "opening">("typing");

  useEffect(() => {
    const form = document.getElementById(formId);
    const input =
      form instanceof HTMLFormElement
        ? form.querySelector<HTMLInputElement>('input[name="code"]')
        : undefined;
    if (!input) return undefined;

    input.value = "";
    input.focus();

    const timers: number[] = [];
    Array.from(code).forEach((digit, index) => {
      timers.push(
        window.setTimeout(() => {
          input.value += digit;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }, 220 + index * 135),
      );
    });

    timers.push(window.setTimeout(() => setStatus("verified"), 1200));
    timers.push(window.setTimeout(() => setStatus("opening"), 1800));
    timers.push(window.setTimeout(() => {
      const form = document.getElementById(formId);
      if (form instanceof HTMLFormElement) form.requestSubmit();
    }, 2500));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [code, formId]);

  return (
    <div className="mt-3 overflow-hidden rounded-[6px] border-2 border-[#17202a] bg-[#d7eee9] text-sm font-semibold text-[#17202a] transition-all duration-500">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="relative grid h-4 w-4 place-items-center rounded-[4px] border-2 border-[#17202a] bg-[#fffaf0]">
          <span className="h-2 w-2 rounded-[2px] bg-[#2a8c84]" />
          {status !== "opening" ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-[#2a8c84]/30" />
          ) : null}
        </span>
        <span>
          {status === "typing"
            ? "halda found your code..."
            : status === "verified"
              ? "code verified."
              : "opening your console..."}
        </span>
      </div>
      <div className="h-1 bg-white/60">
        <div
          className="h-full bg-[#2a8c84] transition-all duration-700 ease-out"
          style={{
            width: status === "typing" ? "45%" : status === "verified" ? "78%" : "100%",
          }}
        />
      </div>
    </div>
  );
}
