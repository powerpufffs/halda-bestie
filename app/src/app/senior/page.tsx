import { SeniorToolkit, type SeniorToolId } from "@/components/halda/senior-toolkit";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const tools = new Set<SeniorToolId>(["essay", "activities", "interview", "deadlines", "decisions"]);

export default async function SeniorToolkitPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tool = readTool(params.tool);

  return <SeniorToolkit initialTool={tool} />;
}

function readTool(value: string | string[] | undefined): SeniorToolId {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && tools.has(raw as SeniorToolId) ? (raw as SeniorToolId) : "essay";
}
