import { CommandCenter } from "@/components/CommandCenter";

// Alias of the home command center so existing /dashboard links keep working.
export default function DashboardPage() {
  return <CommandCenter />;
}
