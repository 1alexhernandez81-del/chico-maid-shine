import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Eye, EyeOff } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lang, toggleLang, t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .in("role", ["admin", "moderator"]);

      if (roleError || !roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast({ title: t("admin.login.denied"), description: t("admin.login.denied.msg"), variant: "destructive" });
        return;
      }

      navigate("/admin");
    } catch (err: any) {
      toast({ title: t("admin.login.failed"), description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-end">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-foreground/50 hover:text-accent transition-colors border border-border rounded px-2.5 py-1.5 hover:border-accent"
            aria-label="Toggle language"
          >
            <span className="text-base leading-none">{lang === "en" ? "🇲🇽" : "🇺🇸"}</span>
            <span>{lang === "en" ? "Español" : "English"}</span>
          </button>
        </div>
        <div className="text-center">
          <h1 className="font-display text-3xl text-foreground">{t("admin.login.title")}</h1>
          <p className="text-muted-foreground text-sm mt-2">{t("admin.login.subtitle")}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("admin.login.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("admin.login.password")}</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("admin.login.signin")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
