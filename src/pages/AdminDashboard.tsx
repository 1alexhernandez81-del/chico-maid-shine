import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Inbox, Briefcase, Users, Activity, UserCheck, Sparkles, Loader2, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardStats from "@/components/admin/DashboardStats";
import InquiriesPipeline from "@/components/admin/InquiriesPipeline";
import JobsBoard from "@/components/admin/JobsBoard";
import UserManagement from "@/components/admin/UserManagement";
import ContactLogs from "@/components/admin/ContactLogs";
import CustomerManagement from "@/components/admin/CustomerManagement";
import CleanerManagement from "@/components/admin/CleanerManagement";
import TimesheetsTab from "@/components/admin/TimesheetsTab";

export type UserRole = "admin" | "moderator" | "user";

type PrefillJob = { name: string; email: string; phone: string; street: string; city: string; zip: string } | null;

const AdminDashboard = () => {
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("user");
  const [activeTab, setActiveTab] = useState("jobs");
  const [prefillJob, setPrefillJob] = useState<PrefillJob>(null);
  const navigate = useNavigate();
  const { lang, toggleLang, t } = useLanguage();
  const { toast } = useToast();

  const isAdmin = userRole === "admin";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/admin/login");
        return;
      }
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .then(({ data }) => {
          if (!data || data.length === 0) {
            navigate("/admin/login");
          } else {
            // Pick highest role
            const roles = data.map((r) => r.role);
            if (roles.includes("admin")) setUserRole("admin");
            else if (roles.includes("moderator")) setUserRole("moderator");
            else setUserRole("user");
            setAuthorized(true);
          }
        });
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
        <p className="text-muted-foreground text-sm font-body">{t("admin.loading")}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">{t("admin.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("admin.subtitle")}
            {!isAdmin && (
              <span className="ml-2 text-xs uppercase tracking-wider text-accent">
                ({userRole})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-foreground/50 hover:text-accent transition-colors border border-border rounded px-2.5 py-1.5 hover:border-accent"
            aria-label="Toggle language"
          >
            <span className="text-base leading-none">{lang === "en" ? "🇲🇽" : "🇺🇸"}</span>
            <span>{lang === "en" ? "Español" : "English"}</span>
          </button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> {t("admin.signout")}
          </Button>
        </div>
      </header>

      <div className="p-6">
        {/* Only admins see stats overview */}
        {isAdmin && <DashboardStats onNavigate={(tab) => setActiveTab(tab)} />}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {/* Only admins see inquiries */}
            {isAdmin && (
              <TabsTrigger value="inquiries" className="gap-2">
                <Inbox className="w-4 h-4" /> {t("admin.tab.inquiries")}
              </TabsTrigger>
            )}
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="w-4 h-4" /> {t("admin.tab.jobs")}
            </TabsTrigger>
            {/* Only admins see customers, activity, users */}
            {isAdmin && (
              <>
                <TabsTrigger value="customers" className="gap-2">
                  <UserCheck className="w-4 h-4" /> {t("admin.tab.customers")}
                </TabsTrigger>
                <TabsTrigger value="cleaners" className="gap-2">
                  <Sparkles className="w-4 h-4" /> {t("admin.tab.cleaners")}
                </TabsTrigger>
                <TabsTrigger value="timesheets" className="gap-2">
                  <Clock className="w-4 h-4" /> {t("admin.tab.timesheets")}
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-2">
                  <Activity className="w-4 h-4" /> {t("admin.tab.activity")}
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="w-4 h-4" /> {t("admin.tab.users")}
                </TabsTrigger>
              </>
            )}
          </TabsList>
          {isAdmin && (
            <TabsContent value="inquiries">
              <InquiriesPipeline />
            </TabsContent>
          )}
          <TabsContent value="jobs">
            <JobsBoard userRole={userRole} prefillJob={prefillJob} />
          </TabsContent>
          {isAdmin && (
            <>
              <TabsContent value="customers">
                <CustomerManagement onCreateJob={(data) => {
                  setPrefillJob(data);
                  setActiveTab("jobs");
                  // Clear prefill after a tick so it can be re-triggered
                  setTimeout(() => setPrefillJob(null), 500);
                }} />
              </TabsContent>
              <TabsContent value="cleaners">
                <CleanerManagement />
              </TabsContent>
              <TabsContent value="timesheets">
                <TimesheetsTab />
              </TabsContent>
              <TabsContent value="activity">
                <ContactLogs />
              </TabsContent>
              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
