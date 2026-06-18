import { Suspense } from "react";
import { ExploreTab } from "@/components/explore/ExploreTab";

export const metadata = {
  title: "Explore · Next by Halda",
  description:
    "Figure out what you're into, find matching schools, see what careers pay, and take the career quiz — the sophomore talk track.",
};

export default function ExplorePage() {
  return (
    <main className="min-h-full bg-zinc-50 dark:bg-black">
      <Suspense fallback={null}>
        <ExploreTab />
      </Suspense>
    </main>
  );
}
