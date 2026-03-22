import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { RefreshCw, MessageCircle, Phone, Smartphone, Monitor, Eye } from "lucide-react";

type ContactLog = {
  id: string;
  created_at: string;
  channel: string;
  source_page: string;
  user_agent: string | null;
};

const parseDevice = (ua: string | null): { device: string; browser: string; os: string } => {
  if (!ua) return { device: "Unknown", browser: "Unknown", os: "Unknown" };

  let device = "Desktop";
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) device = /iPad|Tablet/i.test(ua) ? "Tablet" : "Mobile";

  let browser = "Other";
  if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Edg/i.test(ua)) browser = "Edge";

  let os = "Other";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS/i.test(ua)) os = "macOS";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { device, browser, os };
};

const getTimeOfDay = (date: Date): string => {
  const h = date.getHours();
  if (h < 6) return "Night";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night";
};

const ContactLogs = () => {
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactLog | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const CHANNEL_CONFIG: Record<string, { icon: typeof Phone; label: string; color: string }> = {
    whatsapp: { icon: MessageCircle, label: t("admin.activity.whatsapp"), color: "bg-green-500/20 text-green-400 border-green-500/30" },
    phone: { icon: Phone, label: t("admin.activity.phone"), color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  };

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.activity.error"), variant: "destructive" });
    } else {
      setLogs((data as ContactLog[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const counts = {
    whatsapp: logs.filter((l) => l.channel === "whatsapp").length,
    phone: logs.filter((l) => l.channel === "phone").length,
  };

  // Device breakdown
  const deviceCounts = logs.reduce((acc, log) => {
    const { device } = parseDevice(log.user_agent);
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Time of day breakdown
  const timeCounts = logs.reduce((acc, log) => {
    const tod = getTimeOfDay(new Date(log.created_at));
    acc[tod] = (acc[tod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">{t("admin.activity.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("admin.activity.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> {t("admin.bookings.refresh")}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-4 h-4 text-green-400" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.activity.whatsapp")}</p>
          </div>
          <p className="text-2xl font-semibold">{counts.whatsapp}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-blue-400" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.activity.phonecalls")}</p>
          </div>
          <p className="text-2xl font-semibold">{counts.phone}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.activity.devices")}</p>
          </div>
          <div className="flex gap-3 text-sm">
            {Object.entries(deviceCounts).map(([device, count]) => (
              <span key={device} className="text-muted-foreground">
                <span className="font-semibold text-foreground">{count}</span> {device}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.activity.peakhours")}</p>
          </div>
          <div className="flex gap-3 text-sm">
            {Object.entries(timeCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([time, count]) => (
              <span key={time} className="text-muted-foreground">
                <span className="font-semibold text-foreground">{count}</span> {time}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>{t("admin.activity.datetime")}</TableHead>
              <TableHead>{t("admin.activity.channel")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin.activity.device")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin.activity.browser")}</TableHead>
              <TableHead>{t("admin.activity.page")}</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  {loading ? t("admin.bookings.loading") : t("admin.activity.none")}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const config = CHANNEL_CONFIG[log.channel] || CHANNEL_CONFIG.phone;
                const Icon = config.icon;
                const { device, browser } = parseDevice(log.user_agent);
                return (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => setSelected(log)}>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs gap-1 ${config.color}`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <span className="flex items-center gap-1.5">
                        {device === "Mobile" ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                        {device}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {browser}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.source_page}
                    </TableCell>
                    <TableCell>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.activity.detail")}</DialogTitle>
            <DialogDescription>{t("admin.activity.detail.desc")}</DialogDescription>
          </DialogHeader>
          {selected && (() => {
            const { device, browser, os } = parseDevice(selected.user_agent);
            const config = CHANNEL_CONFIG[selected.channel] || CHANNEL_CONFIG.phone;
            const Icon = config.icon;
            const date = new Date(selected.created_at);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.activity.channel")}</p>
                    <Badge variant="outline" className={`text-xs gap-1 ${config.color}`}>
                      <Icon className="w-3 h-3" /> {config.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.activity.timeofday")}</p>
                    <p className="font-medium">{getTimeOfDay(date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.activity.datetime")}</p>
                    <p>{date.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.activity.page")}</p>
                    <p>{selected.source_page}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.activity.device")}</p>
                    <p className="flex items-center gap-1.5">
                      {device === "Mobile" ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                      {device}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.activity.os")}</p>
                    <p>{os}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.activity.browser")}</p>
                    <p>{browser}</p>
                  </div>
                </div>
                {selected.user_agent && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.activity.useragent")}</p>
                    <p className="text-xs bg-secondary/50 rounded p-3 break-all text-muted-foreground">{selected.user_agent}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactLogs;