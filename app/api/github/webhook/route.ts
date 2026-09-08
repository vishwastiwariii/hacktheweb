import { after, NextResponse, type NextRequest } from "next/server";
import { verifyGithubWebhook } from "@/app/lib/github/webhook";
import { processWebhookEvent } from "@/app/lib/github/process-webhook";
import { createServiceClient } from "@/app/lib/supabase/service";

// The webhook needs the Node runtime: it uses `node:crypto` for signature
// verification and the service-role Supabase client.
export const runtime = "nodejs";

// GitHub webhook receiver.
//
//   GitHub -> verify signature -> store raw delivery -> return 200 -> process
//
// The raw payload is persisted before anything else, so a processing failure
// can be replayed from `webhook_events`. `delivery_id` is unique: a duplicate
// delivery conflicts on insert and we answer 200 so GitHub stops retrying.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const deliveryId = request.headers.get("x-github-delivery");
  const eventType = request.headers.get("x-github-event");

  if (!deliveryId || !eventType) {
    return NextResponse.json(
      { error: "Missing GitHub webhook headers" },
      { status: 400 },
    );
  }

  // Verify the HMAC against the raw body BEFORE parsing JSON.
  if (!verifyGithubWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const repository = payload.repository as { full_name?: string } | undefined;
  const action = typeof payload.action === "string" ? payload.action : null;

  // Store first — the unique delivery_id is the idempotency mechanism.
  const { error: insertError } = await supabase.from("webhook_events").insert({
    delivery_id: deliveryId,
    event_type: eventType,
    action,
    repository_full_name: repository?.full_name ?? null,
    payload,
  });

  if (insertError) {
    // 23505 = unique_violation -> we have already seen this delivery.
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[webhook] failed to store delivery:", insertError);
    return NextResponse.json(
      { error: "Failed to store webhook" },
      { status: 500 },
    );
  }

  // Answer 200 now; process the event after the response is sent. Any failure
  // is recorded on the stored row and can be replayed.
  after(() => processWebhookEvent(supabase, { deliveryId, eventType, payload }));

  return NextResponse.json({ ok: true });
}
