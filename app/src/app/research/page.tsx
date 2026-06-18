import { Suspense } from "react";
import { ResearchTab } from "@/components/research/ResearchTab";

export const metadata = {
  title: "Research · Next by Halda",
  description:
    "Compare schools, track scholarships, plan visits, estimate aid, and explore programs — all scored against your profile.",
};

export default function ResearchPage() {
  return (
    <main className="min-h-full bg-zinc-50 dark:bg-black">
      <Suspense fallback={null}>
        <ResearchTab />
      </Suspense>
    </main>
  );
}
