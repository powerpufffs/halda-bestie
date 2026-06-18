"use client";

import { useMemo, useState } from "react";
import { profile, schools } from "./data";
import { estimateNetPrice, usd } from "./lib";
import { Card, Meter, Pill, SectionHeader, Stat } from "./ui";

/**
 * Very rough Student Aid Index proxy: a slice of income above a household
 * protection allowance. Real FAFSA uses the SAI formula — this is a demo
 * approximation to show how need scales with income and family size.
 */
function estimatedSAI(income: number, householdSize: number): number {
  const protection = 24_000 + (householdSize - 1) * 7_500;
  const discretionary = Math.max(0, income - protection);
  return Math.round(discretionary * 0.22);
}

export function FinancialAidEstimator() {
  const [income, setIncome] = useState(profile.householdIncome);
  const [size, setSize] = useState(profile.householdSize);
  const [budget, setBudget] = useState(profile.budget);

  const sai = estimatedSAI(income, size);
  const pellEligible = sai < 7_000 && income < 60_000;

  const rows = useMemo(
    () =>
      schools
        .map((s) => {
          const net = estimateNetPrice(s, income);
          const gap = net - budget;
          return { school: s, net, gap, need: Math.max(0, s.stickerPrice - net) };
        })
        .sort((a, b) => a.net - b.net),
    [income, budget],
  );

  const affordable = rows.filter((r) => r.gap <= 0).length;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Financial aid estimator"
        subtitle="Move the sliders to see what each school would actually cost your family."
      />

      <Card>
        <div className="grid gap-6 sm:grid-cols-3">
          <SliderField
            label="Household income"
            value={income}
            min={0}
            max={200_000}
            step={5_000}
            format={usd}
            onChange={setIncome}
          />
          <SliderField
            label="Household size"
            value={size}
            min={1}
            max={8}
            step={1}
            format={(n) => `${n} people`}
            onChange={setSize}
          />
          <SliderField
            label="Yearly budget"
            value={budget}
            min={0}
            max={80_000}
            step={1_000}
            format={usd}
            onChange={setBudget}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/[.06] pt-4 sm:grid-cols-4 dark:border-white/[.08]">
          <Stat label="Est. SAI" value={usd(sai)} hint="lower = more aid" />
          <Stat
            label="Pell grant"
            value={pellEligible ? "Likely" : "Unlikely"}
            hint={pellEligible ? "up to ~$7,400/yr" : "income above range"}
          />
          <Stat label="Within budget" value={`${affordable} of ${schools.length}`} hint="schools" />
          <Stat label="Cheapest net" value={usd(rows[0]?.net ?? 0)} hint={rows[0]?.school.name} />
        </div>
        {pellEligible ? (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
            With likely Pell eligibility, prioritize schools that meet full need —
            your out-of-pocket can drop well below the sticker price.
          </p>
        ) : null}
      </Card>

      <div className="space-y-3">
        {rows.map(({ school, net, gap, need }) => {
          const coverage = Math.min(100, (need / school.stickerPrice) * 100);
          return (
            <Card key={school.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {school.name}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Sticker {usd(school.stickerPrice)} · est. aid {usd(need)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {usd(net)}
                    <span className="text-xs font-normal text-zinc-400">/yr</span>
                  </div>
                  {gap <= 0 ? (
                    <Pill tone="green">Within budget</Pill>
                  ) : (
                    <Pill tone="red">{usd(gap)} over</Pill>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <Meter
                  label={`Estimated aid covers ${Math.round(coverage)}% of sticker`}
                  value={coverage}
                  tone="green"
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Net price ≈ 4-year cost of {usd(net * 4)}.
              </p>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400">
        Estimates only. Real awards depend on the FAFSA/CSS Profile, the SAI
        formula, and each school&apos;s aid policies. Always confirm with the
        school&apos;s net price calculator.
      </p>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-zinc-500">{label}</span>
        <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-sky-600"
      />
    </div>
  );
}
