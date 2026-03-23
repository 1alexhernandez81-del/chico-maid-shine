import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) throw new Error("Invalid token");

    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isAdmin = callerRoles?.some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Unauthorized: admin role required");

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list": {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const { data: roles } = await supabase.from("user_roles").select("*");
        const roleMap: Record<string, string[]> = {};
        (roles || []).forEach((r: any) => {
          if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
          roleMap[r.user_id].push(r.role);
        });

        const mapped = users.map((u: any) => ({
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || "",
          roles: roleMap[u.id] || [],
          created_at: u.created_at,
        }));

        return new Response(JSON.stringify({ users: mapped }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create": {
        const { email, password, full_name, role } = body;
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email,
          password,
          user_metadata: { full_name },
          email_confirm: true,
        });
        if (createErr) throw createErr;

        if (role && newUser.user) {
          await supabase.from("user_roles").insert({
            user_id: newUser.user.id,
            role,
          });
        }

        return new Response(JSON.stringify({ success: true, user: newUser.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_role": {
        const { user_id, role } = body;
        // Delete existing roles
        await supabase.from("user_roles").delete().eq("user_id", user_id);
        // Insert new role
        await supabase.from("user_roles").insert({ user_id, role });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { user_id, new_password } = body;
        if (!user_id || !new_password) throw new Error("Missing user_id or new_password");
        if (new_password.length < 6) throw new Error("Password must be at least 6 characters");

        const { error: resetErr } = await supabase.auth.admin.updateUserById(user_id, {
          password: new_password,
        });
        if (resetErr) throw resetErr;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { user_id } = body;
        // Prevent self-delete
        if (user_id === caller.id) throw new Error("Cannot delete your own account");

        await supabase.from("user_roles").delete().eq("user_id", user_id);
        const { error: delErr } = await supabase.auth.admin.deleteUser(user_id);
        if (delErr) throw delErr;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    console.error("manage-users error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
