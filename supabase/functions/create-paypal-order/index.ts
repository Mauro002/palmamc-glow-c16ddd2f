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
const IS_LIVE = PAYPAL_ENV === "live";
const PAYPAL_API_URL = IS_LIVE
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
const PAYPAL_CHECKOUT_URL = IS_LIVE
  ? "https://www.paypal.com/checkoutnow"
  : "https://www.sandbox.paypal.com/checkoutnow";

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

    const userId = claimsData.claims.sub;

    const { rankName, price, minecraftUsername } = await req.json();

    if (!rankName || !price || !minecraftUsername) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^[a-zA-Z0-9_]{3,16}$/.test(minecraftUsername)) {
      return new Response(
        JSON.stringify({ error: "Invalid Minecraft username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating PayPal order for ${rankName} at ${price}€ for user ${minecraftUsername}`);

    const accessToken = await getPayPalAccessToken();

    const orderResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "EUR",
              value: price.toString(),
            },
            description: `EldenMC - Rank ${rankName} per ${minecraftUsername}`,
          },
        ],
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("PayPal order creation failed:", orderData);
      return new Response(
        JSON.stringify({ error: "Failed to create PayPal order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const approveUrl = orderData?.links?.find((link: { rel: string }) => link.rel === "approve")?.href;
    const checkoutUrl = approveUrl || `${PAYPAL_CHECKOUT_URL}?token=${orderData.id}`;

    // Save order to database
    const { error: insertError } = await supabase.from("orders").insert({
      user_id: userId,
      minecraft_username: minecraftUsername,
      rank_name: rankName,
      price: parseFloat(price),
      paypal_order_id: orderData.id,
      status: "pending",
    });

    if (insertError) {
      console.error("Failed to save order:", insertError);
    }

    console.log(`PayPal order created: ${orderData.id}`);

    return new Response(
      JSON.stringify({
        orderId: orderData.id,
        checkoutUrl,
        paypalEnv: IS_LIVE ? "live" : "sandbox",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
