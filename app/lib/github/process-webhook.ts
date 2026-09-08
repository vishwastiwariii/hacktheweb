import type { SupabaseClient } from "@supabase/supabase-js";
import { handlePullRequestEvent } from "./handle-pull-request";

// Runs after the raw delivery is stored and the 200 is sent. Failures are
// recorded on the `webhook_events` row (`process_error`) and swallowed — the
// stored payload can be replayed. `processed_at` is stamped either way so a
// replay job can tell "done" from "never picked up".
export async function processWebhookEvent(
  supabase: SupabaseClient,
  args: { deliveryId: string; eventType: string; payload: unknown },
): Promise<void> {
  const { deliveryId, eventType, payload } = args;

  let processError: string | null = null;

  try {
    if (eventType === "pull_request") {
      await handlePullRequestEvent(
        supabase,
        payload as Parameters<typeof handlePullRequestEvent>[1],
      );
    }
    // Other event types (ping, issues, …) are stored for audit only. Issues and
    // repositories are kept in sync through the REST admin import, not here.
  } catch (err) {
    processError =
      err instanceof Error ? err.message : "unknown webhook processing error";
    console.error(`[webhook ${deliveryId}] processing failed:`, err);
  }

  const { error } = await supabase
    .from("webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      process_error: processError,
    })
    .eq("delivery_id", deliveryId);

  if (error) {
    console.error(
      `[webhook ${deliveryId}] failed to mark processed:`,
      error.message,
    );
  }
}
