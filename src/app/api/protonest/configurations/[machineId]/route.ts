import { NextResponse } from "next/server";

import { createLogger } from "@/src/lib/logging";
import { updateDeviceConfigurations } from "@/src/lib/protonest/client";

const log = createLogger("api-configurations", "server");

interface Params {
  params: Promise<{
    machineId: string;
  }>;
}

interface UpdateConfigurationsRequest {
  channel1Hours: number;
  channel2Hours: number;
  channel1Threshold: number;
  channel2Threshold: number;
}

function isValidValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { machineId } = await params;
    const body = (await request.json()) as Partial<UpdateConfigurationsRequest>;

    const {
      channel1Hours,
      channel2Hours,
      channel1Threshold,
      channel2Threshold,
    } = body;

    if (
      !isValidValue(channel1Hours) ||
      !isValidValue(channel2Hours) ||
      !isValidValue(channel1Threshold) ||
      !isValidValue(channel2Threshold)
    ) {
      return NextResponse.json(
        {
          error:
            "channel1Hours, channel2Hours, channel1Threshold, and channel2Threshold must be non-negative finite numbers.",
        },
        { status: 400 },
      );
    }

    log.debug("request_start", {
      machineId,
      channel1Hours,
      channel2Hours,
      channel1Threshold,
      channel2Threshold,
    });

    const data = await updateDeviceConfigurations(machineId, {
      channel1Hours,
      channel2Hours,
      channel1Threshold,
      channel2Threshold,
    });

    return NextResponse.json(
      {
        ok: true,
        data,
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
      error instanceof Error ? error.message : "Failed to update configurations.";
    log.error("request_failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
