import { createClient } from "npm:@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\\s+/i, "");
  if (!jwt) return json({ error: "Missing authentication" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration is incomplete" }, 500);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);

  let body: { tent_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.tent_id) return json({ error: "tent_id is required" }, 400);

  const { data: tent, error: tentError } = await admin
    .from("tents")
    .select("id, name, user_id")
    .eq("id", body.tent_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (tentError) return json({ error: "Could not verify tent ownership" }, 500);
  if (!tent) return json({ error: "Tent not found" }, 404);

  const { data: devices, error: deviceError } = await admin
    .from("devices")
    .select("id")
    .eq("tent_id", tent.id);

  if (deviceError) return json({ error: "Could not find the tent device" }, 500);
  if (!devices?.length) return json({ error: "No device is registered to this tent" }, 404);

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");

  const { error: updateError } = await admin
    .from("devices")
    .update({ token_hash: tokenHash })
    .eq("tent_id", tent.id);

  if (updateError) return json({ error: "Could not rotate device token" }, 500);

  return json({ ok: true, tent: { id: tent.id, name: tent.name }, device_token: token });
});