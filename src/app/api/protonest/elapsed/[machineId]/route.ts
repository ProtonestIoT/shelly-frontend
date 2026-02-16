import { NextResponse } from "next/server";

import { ELAPSED_HOURS_MAX, ELAPSED_HOURS_MIN, isElapsedHoursInRange } from "@/src/lib/elapsed";
import { createLogger } from "@/src/lib/logging";
import { updateElapsedTimeHours } from "@/src/lib/protonest/client";

const log = createLogger("api-elapsed", "server");

interface Params {
  params: Promise<{
    machineId: string;
  }>;
}

interface UpdateElapsedRequest {
  hours: number;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { machineId } = await params;
    const body = (await request.json()) as Partial<UpdateElapsedRequest>;
    const hours = body.hours;

    if (
      typeof hours !== "number" ||
      !Number.isFinite(hours) ||
      !isElapsedHoursInRange(hours)
    ) {
      return NextResponse.json(
        {
          error: `hours must be between ${ELAPSED_HOURS_MIN} and ${ELAPSED_HOURS_MAX}.`,
        },
        { status: 400 },
      );
    }

    log.debug("request_start", {
      machineId,
      hours,
    });

    await updateElapsedTimeHours(machineId, hours);

    return NextResponse.json(
      {
        ok: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update elapsed time.";
    log.error("request_failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
