import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: string;
  department_id: string | null;
  inviter_name: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user making the request
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("User verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin or moderator
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const isAdmin = roles?.some(r => r.role === "admin" || r.role === "moderator");
    if (!isAdmin) {
      console.error("User is not admin/moderator");
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin or moderator access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, role, department_id, inviter_name }: InviteRequest = await req.json();
    
    console.log(`Creating invite for ${email} with role ${role}`);

    // Check if invite already exists and is pending
    const { data: existingInvite } = await supabase
      .from("staff_invites")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "An invite is already pending for this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the invite
    const { data: invite, error: inviteError } = await supabase
      .from("staff_invites")
      .insert({
        email: email.toLowerCase(),
        role,
        department_id,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invite:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invite" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get department name if provided
    let departmentName = "General";
    if (department_id) {
      const { data: dept } = await supabase
        .from("departments")
        .select("name")
        .eq("id", department_id)
        .single();
      if (dept) departmentName = dept.name;
    }

    // Get app URL from request origin or use default
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const inviteUrl = `${origin}/auth?invite=${invite.token}`;

    console.log(`Sending invite email to ${email}`);

    // Send the invite email using Resend REST API
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Favorite Logistics <onboarding@resend.dev>",
        to: [email],
        subject: `You've been invited to join Favorite Logistics`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
            </div>
            
            <p style="font-size: 16px;">Hi there,</p>
            
            <p style="font-size: 16px;">
              <strong>${inviter_name}</strong> has invited you to join the <strong>Favorite Logistics</strong> team as a <strong style="color: #4f46e5;">${role}</strong> in the <strong>${departmentName}</strong> department.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #4f46e5, #06b6d4); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #4f46e5; word-break: break-all;">${inviteUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </body>
          </html>
        `,
      }),
    });

    const emailError = !emailRes.ok ? await emailRes.text() : null;

    if (emailError) {
      console.error("Failed to send email:", emailError);
      // Don't delete the invite, just warn
      return new Response(
        JSON.stringify({ 
          success: true, 
          invite_id: invite.id,
          warning: "Invite created but email delivery failed. Please share the invite link manually.",
          invite_url: inviteUrl
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Invite sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invite_id: invite.id,
        message: "Invitation sent successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-staff-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
