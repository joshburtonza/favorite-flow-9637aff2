import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Team members to create
const TEAM_MEMBERS = [
  {
    email: "rapizo92@gmail.com",
    full_name: "Mohamed Irshad",
    role: "admin",
  },
  {
    email: "ars7866@gmail.com",
    full_name: "Abdul",
    role: "accountant",
  },
  {
    email: "shamimahc7866@gmail.com",
    full_name: "Shamima",
    role: "file_costing",
  },
  {
    email: "marissa.m7866@gmail.com",
    full_name: "Marissa",
    role: "shipping",
  },
  {
    email: "cindyoldewage857@gmail.com",
    full_name: "Cindy",
    role: "accountant",
  },
];

const DEFAULT_PASSWORD = "12345678";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: { email: string; status: string; error?: string }[] = [];

    for (const member of TEAM_MEMBERS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u) => u.email?.toLowerCase() === member.email.toLowerCase()
        );

        if (existingUser) {
          // User exists - update their profile and ensure role is set
          await supabaseAdmin
            .from("profiles")
            .upsert({
              id: existingUser.id,
              email: member.email,
              full_name: member.full_name,
            });

          // Ensure user has the correct role
          await supabaseAdmin.from("user_roles").upsert(
            { user_id: existingUser.id, role: member.role },
            { onConflict: "user_id,role" }
          );

          results.push({
            email: member.email,
            status: "exists - role updated",
          });
        } else {
          // Create new user
          const { data: newUser, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email: member.email,
              password: DEFAULT_PASSWORD,
              email_confirm: true, // Auto-confirm email
              user_metadata: {
                full_name: member.full_name,
              },
            });

          if (createError) {
            results.push({
              email: member.email,
              status: "error",
              error: createError.message,
            });
            continue;
          }

          if (newUser?.user) {
            // Create profile
            await supabaseAdmin.from("profiles").upsert({
              id: newUser.user.id,
              email: member.email,
              full_name: member.full_name,
            });

            // Assign role
            await supabaseAdmin.from("user_roles").upsert(
              { user_id: newUser.user.id, role: member.role },
              { onConflict: "user_id,role" }
            );

            results.push({
              email: member.email,
              status: "created",
            });
          }
        }
      } catch (memberError: any) {
        results.push({
          email: member.email,
          status: "error",
          error: memberError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Team users seeding completed",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error seeding team users:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
