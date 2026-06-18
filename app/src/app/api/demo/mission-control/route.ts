import { NextResponse, type NextRequest } from "next/server";
import { getDemoMissionControlSnapshot } from "@/lib/demo-mission-control";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const snapshot = await getDemoMissionControlSnapshot(userId);

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
