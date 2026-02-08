import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET")!;
const PAYPAL_ENV = (Deno.env.get("PAYPAL_ENV") ?? "live").toLowerCase();
const PAYPAL_API_URL = PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
const MINECRAFT_RANK_WEBHOOK_URL = Deno.env.get("MINECRAFT_RANK_WEBHOOK_URL");
const DISCORD_TICKET_WEBHOOK_URL = Deno.env.get("DISCORD_TICKET_WEBHOOK_URL");

async function openDiscordTicket(input: {
  minecraftUsername: string;
  rankName: string;
  paypalOrderId: string;
  reason: string;
}) {
  if (!DISCORD_TICKET_WEBHOOK_URL) return null;

  const content = [
    "🎫 **Ticket automatico consegna rank**",
    `- Username MC: **${input.minecraftUsername}**`,
    `- Rank: **${input.rankName}**`,
    `- PayPal order: **${input.paypalOrderId}**`,
    `- Motivo: ${input.reason}`,
  ].join("\n");

  const discordResponse = await fetch(DISCORD_TICKET_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  return discordResponse.ok;
}

async function getPayPalAccessToken(): Promise<string> {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`);
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing order ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Capturing PayPal order: ${orderId}`);

    const accessToken = await getPayPalAccessToken();

    const captureResponse = await fetch(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = await captureResponse.json();

    if (!captureResponse.ok) {
      console.error("PayPal capture failed:", captureData);
      
      // Update order status to failed
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("paypal_order_id", orderId);

      return new Response(
        JSON.stringify({ error: "Failed to capture payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    const { data: orderData } = await supabase
      .from("orders")
      .select("id, minecraft_username, rank_name")
      .eq("paypal_order_id", orderId)
      .single();

    // Update order status to completed
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "completed",
        paypal_capture_id: captureId,
      })
      .eq("paypal_order_id", orderId);

    if (updateError) {
      console.error("Failed to update order:", updateError);
    }

    console.log(`PayPal order captured successfully: ${orderId}, capture ID: ${captureId}`);

    if (!orderData) {
      return new Response(
        JSON.stringify({
          success: true,
          captureId,
          message: "Pagamento completato. Ordine registrato, verifica in supporto se necessario.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let deliveryOk = false;
    let deliveryError = "Nessun endpoint di consegna rank configurato";

    if (MINECRAFT_RANK_WEBHOOK_URL) {
      try {
        const deliveryResponse = await fetch(MINECRAFT_RANK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            captureId,
            minecraftUsername: orderData.minecraft_username,
            rankName: orderData.rank_name,
          }),
        });

        if (deliveryResponse.ok) {
          deliveryOk = true;
        } else {
          deliveryError = `Rank webhook failed: ${deliveryResponse.status}`;
        }
      } catch (error) {
        deliveryError = `Rank webhook error: ${(error as Error).message}`;
      }
    }

    if (deliveryOk) {
      await supabase
        .from("orders")
        .update({ status: "delivered", delivery_error: null })
        .eq("paypal_order_id", orderId);

      return new Response(
        JSON.stringify({
          success: true,
          captureId,
          message: "Pagamento completato e rank assegnato correttamente.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ticketCreated = await openDiscordTicket({
      minecraftUsername: orderData.minecraft_username,
      rankName: orderData.rank_name,
      paypalOrderId: orderId,
      reason: deliveryError,
    });

    await supabase
      .from("orders")
      .update({ status: "delivery_failed", delivery_error: deliveryError })
      .eq("paypal_order_id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        captureId,
        requiresSupport: true,
        message: ticketCreated
          ? "Pagamento completato, ma consegna automatica non riuscita. Ticket Discord aperto automaticamente."
          : "Pagamento completato, ma consegna automatica non riuscita. Apri un ticket su Discord.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error capturing PayPal order:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
