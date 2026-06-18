import { DemoMissionControl } from "@/components/halda/demo-mission-control";

interface DemoPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const params = await searchParams;
  const initialUserId = readQuery(params.userId);

  return <DemoMissionControl initialUserId={initialUserId} />;
}

function readQuery(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
