import { NextResponse } from "next/server";

import { createLogger } from "@/src/lib/logging";
import { fetchMachineStateDashboardData } from "@/src/lib/protonest/client";

const log = createLogger("api-dashboard", "server");

interface Params {
  params: Promise<{
    machineId: string;
  }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { machineId } = await params;
    log.debug("request_start", { machineId });
    const data = await fetchMachineStateDashboardData(machineId);
    log.info("request_success", { machineId, state: data.machine.state });

    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard data.";
    log.error("request_failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
