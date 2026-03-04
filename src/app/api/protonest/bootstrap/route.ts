import { NextResponse } from "next/server";

import { createLogger } from "@/src/lib/logging";
import {
  fetchMachineStateDashboardData,
  fetchProjectMachineList,
} from "@/src/lib/protonest/client";

const log = createLogger("api-bootstrap", "server");

export async function GET() {
  try {
    log.debug("request_start");
    const machines = await fetchProjectMachineList();

    const firstMachine = machines[0];
    const firstChannel = firstMachine?.channels[0] ?? null;
    const initialDashboard =
      firstMachine && firstChannel
        ? {
            machineId: firstMachine.id,
            channelId: firstChannel,
            data: await fetchMachineStateDashboardData(firstMachine.id, firstChannel),
          }
        : null;

    log.info("request_success", {
      machineCount: machines.length,
      hasInitialDashboard: Boolean(initialDashboard),
    });

    return NextResponse.json(
      {
        machines,
        initialDashboard,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load bootstrap data.";
    log.error("request_failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
