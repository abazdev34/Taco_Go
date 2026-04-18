import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    console.log("SUPABASE_URL exists:", !!supabaseUrl);
    console.log("SUPABASE_ANON_KEY exists:", !!anonKey);
    console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!serviceRoleKey);

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");
    console.log("AUTH HEADER EXISTS:", !!authHeader);
    console.log(
      "AUTH HEADER START:",
      authHeader ? authHeader.slice(0, 20) + "..." : null
    );

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    console.log("USER ERROR:", userError);
    console.log("USER:", user);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: userError?.message || "Unauthorized" }),
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const { data: profile, error: profileFetchError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    console.log("PROFILE:", profile);
    console.log("PROFILE FETCH ERROR:", profileFetchError);

    if (profileFetchError) {
      return new Response(
        JSON.stringify({ error: profileFetchError.message }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admin" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { email, password, full_name, role } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({
          error: "email, password, full_name, role required",
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      return new Response(
        JSON.stringify({ error: error?.message || "Failed to create user" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: data.user.id,
      role,
      status: "approved",
    });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (e: any) {
    console.error("FUNCTION ERROR:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Internal server error" }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});