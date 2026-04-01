import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { CalendarCheck, Clock, DollarSign, TrendingUp, Inbox, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Stats = {
  totalBookings: number;
  pending: number;
  approved: number;
  completed: number;
  totalRevenue: number;
  thisMonthBookings: number;
};

const DashboardStats = ({ onNavigate }: { onNavigate?: (tab: string) => void }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    // Ensure we have an auth session before querying RLS-protected tables
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("status, total_price, total_paid, created_at");

    if (error) {
      console.error("Stats fetch error:", error);
      setLoading(false);
      return;
    }

    if (bookings) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      setStats({
        totalBookings: bookings.length,
        pending: bookings.filter((b) => b.status === "pending").length,
        approved: bookings.filter((b) => ["approved", "scheduled", "in-progress"].includes(b.status)).length,
        completed: bookings.filter((b) => b.status === "completed").length,
        totalRevenue: bookings
          .filter((b) => b.status === "completed")
          .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0),
        thisMonthBookings: bookings.filter((b) => b.created_at >= monthStart).length,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();

    // Re-fetch when auth state changes (login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchStats();
    });

    return () => subscription.unsubscribe();
  }, [fetchStats]);

  if (!stats) return null;

  const cards = [
    { label: t("admin.stats.total"), value: stats.totalBookings, icon: Inbox, color: "text-blue-400", tab: "jobs" },
    { label: t("admin.stats.pending"), value: stats.pending, icon: Clock, color: "text-yellow-400", tab: "inquiries" },
    { label: t("admin.stats.active"), value: stats.approved, icon: CalendarCheck, color: "text-green-400", tab: "jobs" },
    { label: t("admin.stats.completed"), value: stats.completed, icon: CheckCircle, color: "text-emerald-400", tab: "jobs" },
    { label: t("admin.stats.revenue"), value: `$${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-accent", tab: "jobs" },
    { label: t("admin.stats.thismonth"), value: stats.thisMonthBookings, icon: TrendingUp, color: "text-purple-400", tab: "jobs" },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium">{t("admin.stats.overview")}</h2>
        <Button variant="ghost" size="sm" onClick={fetchStats} disabled={loading} className="h-7 text-xs gap-1.5">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> {t("admin.bookings.refresh")}
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <button
          key={card.label}
          onClick={() => onNavigate?.(card.tab)}
          className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1 text-left hover:border-accent/50 hover:bg-accent/5 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <p className="text-xl font-semibold mt-1">{card.value}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{card.label}</p>
        </button>
      ))}
      </div>
    </div>
  );
};

export default DashboardStats;
