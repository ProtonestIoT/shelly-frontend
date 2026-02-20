import { toast } from "sonner";

export function notifyDeviceChanged(deviceName: string) {
  toast.info(`Device switched to ${deviceName}.`);
}

export function notifyChannelChanged(channelName: string) {
  toast.info(`Channel switched to ${channelName}.`);
}

export function notifyElapsedUpdated(elapsedHours: number) {
  toast.success(`Elapsed time updated to ${elapsedHours.toFixed(2)} hours.`);
}

export function notifyElapsedUpdateFailed(message = "Failed to update elapsed time.") {
  toast.error(message);
}

export function notifyThresholdUpdated(threshold: number) {
  toast.success(`Power threshold updated to ${threshold.toFixed(2)}.`);
}

export function notifyThresholdUpdateFailed(message = "Failed to update power threshold.") {
  toast.error(message);
}
