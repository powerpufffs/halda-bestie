"use client";

import { HaldaButton } from "./base-ui";
import {
  EmptyState,
  findBestValue,
  findTopFit,
  money,
  netPrice,
  offerStatuses,
  SummaryCard,
  ToolkitPanel,
  uid,
  type Offer,
} from "./senior-toolkit-utils";

export function DecisionPanel({
  offers,
  setOffers,
}: {
  offers: Offer[];
  setOffers: (value: Offer[] | ((previous: Offer[]) => Offer[])) => void;
}) {
  const addOffer = () => {
    setOffers((previous) => [
      ...previous,
      { id: uid(), school: "", status: "accepted", cost: 0, aid: 0, fit: 7, notes: "" },
    ]);
  };
  const bestValue = findBestValue(offers);
  const topFit = findTopFit(offers);

  return (
    <ToolkitPanel
      action={<HaldaButton onClick={addOffer} size="sm" tone="outline" type="button">add school</HaldaButton>}
      title="decision and aid matrix"
    >
      {offers.length === 0 ? (
        <EmptyState
          action={<HaldaButton onClick={addOffer} type="button">add first offer</HaldaButton>}
          text="compare accepted schools by net price, fit, and deadline risk."
        />
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard label="best financial value" value={bestValue ? `${bestValue.school || "unnamed"}, ${money(netPrice(bestValue))}/yr` : "add cost data"} />
            <SummaryCard label="strongest fit" value={topFit ? `${topFit.school || "unnamed"}, ${topFit.fit}/10` : "rate each fit"} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#dbe6e8] bg-white">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#dbe6e8] bg-[#fbfdfd] text-left text-xs font-semibold text-[#607283]">
                  <th className="px-3 py-3">school</th>
                  <th className="px-3 py-3">status</th>
                  <th className="px-3 py-3">cost</th>
                  <th className="px-3 py-3">aid</th>
                  <th className="px-3 py-3">net</th>
                  <th className="px-3 py-3">fit</th>
                  <th className="px-3 py-3">notes</th>
                  <th className="px-3 py-3"><span className="sr-only">actions</span></th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    onRemove={() => setOffers((previous) => previous.filter((item) => item.id !== offer.id))}
                    onUpdate={(patch) =>
                      setOffers((previous) => previous.map((item) => (item.id === offer.id ? { ...item, ...patch } : item)))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ToolkitPanel>
  );
}

function OfferRow({
  offer,
  onRemove,
  onUpdate,
}: {
  offer: Offer;
  onRemove: () => void;
  onUpdate: (patch: Partial<Offer>) => void;
}) {
  const label = offer.school || "school";

  return (
    <tr className="border-b border-[#edf3f3] last:border-0">
      <td className="px-3 py-3">
        <input
          aria-label={`${label} name`}
          className="h-9 w-full rounded-md border border-[#cad8dc] px-2 text-sm outline-none focus:border-[#2a8c84]"
          onChange={(event) => onUpdate({ school: event.target.value })}
          placeholder="school"
          value={offer.school}
        />
      </td>
      <td className="px-3 py-3">
        <select
          aria-label={`${label} decision status`}
          className="h-9 rounded-md border border-[#cad8dc] px-2 text-sm outline-none focus:border-[#2a8c84]"
          onChange={(event) => onUpdate({ status: event.target.value as Offer["status"] })}
          value={offer.status}
        >
          {offerStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3"><MoneyInput label={`${label} cost`} value={offer.cost} onChange={(cost) => onUpdate({ cost })} /></td>
      <td className="px-3 py-3"><MoneyInput label={`${label} aid`} value={offer.aid} onChange={(aid) => onUpdate({ aid })} /></td>
      <td className="px-3 py-3 font-semibold tabular-nums text-[#172637]">{money(netPrice(offer))}</td>
      <td className="px-3 py-3">
        <input
          aria-label={`${label} fit score`}
          className="w-24 accent-[#2a8c84]"
          max={10}
          min={1}
          onChange={(event) => onUpdate({ fit: Number(event.target.value) })}
          type="range"
          value={offer.fit}
        />
        <span className="ml-2 text-xs font-semibold text-[#607283]">{offer.fit}/10</span>
      </td>
      <td className="px-3 py-3">
        <input
          aria-label={`${label} notes`}
          className="h-9 w-full rounded-md border border-[#cad8dc] px-2 text-sm outline-none focus:border-[#2a8c84]"
          onChange={(event) => onUpdate({ notes: event.target.value })}
          placeholder="fit notes"
          value={offer.notes}
        />
      </td>
      <td className="px-3 py-3">
        <button className="text-sm font-medium text-[#a34030] hover:underline" onClick={onRemove} type="button">
          remove
        </button>
      </td>
    </tr>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex h-9 w-28 items-center rounded-md border border-[#cad8dc] bg-white px-2 focus-within:border-[#2a8c84]">
      <span className="sr-only">{label}</span>
      <span className="text-xs text-[#758694]">$</span>
      <input
        className="min-w-0 flex-1 bg-transparent px-1 text-sm tabular-nums outline-none"
        min={0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        type="number"
        value={value || ""}
      />
    </label>
  );
}
