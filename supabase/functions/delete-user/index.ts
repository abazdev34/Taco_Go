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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");

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
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: userError?.message || "Unauthorized" }),
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const { data: myProfile, error: myProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (myProfileError) {
      return new Response(JSON.stringify({ error: myProfileError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!myProfile || myProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admin" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete yourself" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user_id
    );

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_user_id: user_id,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Internal server error" }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});