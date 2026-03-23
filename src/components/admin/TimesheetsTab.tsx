import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Clock, RefreshCw, Calendar, Copy, Loader2, Users, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { JobTimeEntry, Cleaner, Booking } from "./shared/types";

type EntryWithBooking = JobTimeEntry & { booking?: Booking; effectiveCleaners: string[] };

const TimesheetsTab = () => {
  const [entries, setEntries] = useState<EntryWithBooking[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanerFilter, setCleanerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const fetchData = async () => {
    setLoading(true);
    const [entriesRes, cleanersRes, bookingsRes] = await Promise.all([
      supabase.from("job_time_entries").select("*").not("stopped_at", "is", null).order("started_at", { ascending: false }),
      supabase.from("cleaners").select("id, name, active").order("name"),
      supabase.from("bookings").select("id, name, street, city, zip, service_type, assigned_cleaners"),
    ]);

    const allCleaners = (cleanersRes.data || []) as Cleaner[];
    setCleaners(allCleaners);

    const bookingsMap = new Map<string, Booking>();
    for (const b of (bookingsRes.data || []) as Booking[]) {
      bookingsMap.set(b.id, b);
    }

    const raw = ((entriesRes.data || []) as any[]) as JobTimeEntry[];
    setEntries(raw.map((e) => {
      const booking = bookingsMap.get(e.booking_id);
      const entryCleaners = Array.isArray(e.cleaners) && e.cleaners.length > 0 ? e.cleaners : [];
      const bookingCleaners = booking && Array.isArray((booking as any).assigned_cleaners) && (booking as any).assigned_cleaners.length > 0
        ? (booking as any).assigned_cleaners
        : [];
      const effectiveCleaners = entryCleaners.length > 0 ? entryCleaners : bookingCleaners;
      return { ...e, booking, effectiveCleaners };
    }));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getCleanerName = (id: string) => cleaners.find((c) => c.id === id)?.name || "Unknown";

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (cleanerFilter !== "all") {
        if (!e.effectiveCleaners.includes(cleanerFilter)) return false;
      }
      if (dateFrom && e.started_at && new Date(e.started_at) < new Date(dateFrom)) return false;
      if (dateTo && e.started_at && new Date(e.started_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [entries, cleanerFilter, dateFrom, dateTo]);

  const expandedRows = useMemo(() => {
    const rows: Array<{
      entryId: string;
      cleanerId: string;
      cleanerName: string;
      date: string;
      customerName: string;
      address: string;
      clockIn: string;
      clockOut: string;
      breakMins: number;
      totalMins: number;
      notes: string;
      sharedWith: number;
    }> = [];

    for (const e of filtered) {
      const cleanerIds = e.effectiveCleaners.length > 0 ? e.effectiveCleaners : ["unassigned"];
      const sharedWith = cleanerIds.length;
      const totalMins = e.total_worked_minutes || 0;
      const breakMins = e.total_paused_minutes || 0;

      for (const cid of cleanerIds) {
        rows.push({
          entryId: e.id,
          cleanerId: cid,
          cleanerName: cid === "unassigned" ? "Unassigned" : getCleanerName(cid),
          date: e.started_at ? new Date(e.started_at).toLocaleDateString() : "—",
          customerName: e.booking?.name || "—",
          address: e.booking ? `${e.booking.street}, ${e.booking.city}` : "—",
          clockIn: e.started_at ? new Date(e.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
          clockOut: e.stopped_at ? new Date(e.stopped_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
          breakMins,
          totalMins,
          notes: e.notes || "",
          sharedWith,
        });
      }
    }

    return rows;
  }, [filtered, cleaners]);

  const computeSummary = (filterFn: (e: EntryWithBooking) => boolean) => {
    const subset = entries.filter(filterFn);
    const cleanerMap = new Map<string, { jobs: number; totalMins: number }>();

    for (const e of subset) {
      const ids = e.effectiveCleaners.length > 0 ? e.effectiveCleaners : ["unassigned"];
      for (const cid of ids) {
        const existing = cleanerMap.get(cid) || { jobs: 0, totalMins: 0 };
        existing.jobs += 1;
        existing.totalMins += e.total_worked_minutes || 0;
        cleanerMap.set(cid, existing);
      }
    }

    return Array.from(cleanerMap.entries()).map(([cid, data]) => ({
      cleanerId: cid,
      cleanerName: cid === "unassigned" ? "Unassigned" : getCleanerName(cid),
      jobs: data.jobs,
      totalHours: Math.round((data.totalMins / 60) * 100) / 100,
      avgHours: data.jobs > 0 ? Math.round((data.totalMins / 60 / data.jobs) * 100) / 100 : 0,
    }));
  };

  const weekSummary = computeSummary((e) => e.started_at ? new Date(e.started_at) >= weekStart : false);
  const monthSummary = computeSummary((e) => e.started_at ? new Date(e.started_at) >= monthStart : false);
  const customSummary = (dateFrom || dateTo)
    ? computeSummary((e) => {
        if (!e.started_at) return false;
        const d = new Date(e.started_at);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
        return true;
      })
    : [];

  const copyToClipboard = (data: typeof weekSummary) => {
    const lines = [`${t("admin.ts.cleaner")}\t${t("admin.ts.jobs")}\t${t("admin.ts.totalhours")}\t${t("admin.ts.avghours")}`];
    for (const r of data) {
      lines.push(`${r.cleanerName}\t${r.jobs}\t${r.totalHours}\t${r.avgHours}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: t("admin.ts.copied"), description: t("admin.ts.copied.desc") });
  };

  const copyDetailedToClipboard = () => {
    const lines = [`${t("admin.ts.cleaner")}\t${t("admin.ts.date")}\t${t("admin.ts.customer")}\t${t("admin.ts.address")}\t${t("admin.ts.clockin")}\t${t("admin.ts.clockout")}\t${t("admin.ts.break")}\t${t("admin.ts.totalhours")}\t${t("admin.ts.notes")}`];
    for (const r of expandedRows) {
      const hours = Math.floor(r.totalMins / 60);
      const mins = r.totalMins % 60;
      lines.push(`${r.cleanerName}\t${r.date}\t${r.customerName}\t${r.address}\t${r.clockIn}\t${r.clockOut}\t${r.breakMins}m\t${hours}h ${mins}m\t${r.notes}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: t("admin.ts.copied"), description: t("admin.ts.detailed.copied") });
  };

  const exportToExcel = () => {
    const headers = [
      t("admin.ts.cleaner"), t("admin.ts.date"), t("admin.ts.customer"),
      t("admin.ts.address"), t("admin.ts.clockin"), t("admin.ts.clockout"),
      t("admin.ts.break"), t("admin.ts.totalhours"), t("admin.ts.notes"),
    ];
    const data = expandedRows.map((r) => {
      const hours = Math.floor(r.totalMins / 60);
      const mins = r.totalMins % 60;
      return [r.cleanerName, r.date, r.customerName, r.address, r.clockIn, r.clockOut, `${r.breakMins}m`, `${hours}h ${mins}m`, r.notes];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    // Auto-size columns
    ws["!cols"] = headers.map((_, i) => ({
      wch: Math.max(headers[i].length, ...data.map((row) => String(row[i] || "").length)) + 2,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `timesheet_${dateStr}.xlsx`);
    toast({ title: t("admin.ts.copied"), description: t("admin.ts.excel.exported") });
  };

  const SummaryTable = ({ title, data }: { title: string; data: typeof weekSummary }) => (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {data.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(data)} className="h-6 text-[10px] gap-1">
            <Copy className="w-3 h-3" /> {t("admin.ts.copy")}
          </Button>
        )}
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("admin.ts.noentries")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">{t("admin.ts.cleaner")}</TableHead>
              <TableHead className="text-xs text-center">{t("admin.ts.jobs")}</TableHead>
              <TableHead className="text-xs text-center">{t("admin.ts.totalhours")}</TableHead>
              <TableHead className="text-xs text-center">{t("admin.ts.avghours")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.cleanerId}>
                <TableCell className="text-sm font-medium">{r.cleanerName}</TableCell>
                <TableCell className="text-sm text-center">{r.jobs}</TableCell>
                <TableCell className="text-sm text-center font-mono">{r.totalHours}h</TableCell>
                <TableCell className="text-sm text-center font-mono">{r.avgHours}h</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryTable title={t("admin.ts.thisweek")} data={weekSummary} />
        <SummaryTable title={t("admin.ts.thismonth")} data={monthSummary} />
        <SummaryTable title={t("admin.ts.custom")} data={customSummary} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 items-center">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-muted-foreground text-sm">{t("admin.ts.to")}</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
          />
        </div>
        {cleaners.length > 0 && (
          <Select value={cleanerFilter} onValueChange={setCleanerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("admin.ts.allcleaners")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.ts.allcleaners")}</SelectItem>
              {cleaners.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> {t("admin.ts.refresh")}
        </Button>
        {expandedRows.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyDetailedToClipboard} className="gap-2">
              <Copy className="w-4 h-4" /> {t("admin.ts.copy")}
            </Button>
            <Button variant="outline" onClick={exportToExcel} className="gap-2">
              <Download className="w-4 h-4" /> {t("admin.ts.exportexcel")}
            </Button>
          </div>
        )}
      </div>

      {/* Detailed Entries — per-cleaner rows */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="text-xs">{t("admin.ts.cleaner")}</TableHead>
              <TableHead className="text-xs">{t("admin.ts.date")}</TableHead>
              <TableHead className="text-xs">{t("admin.ts.customer")}</TableHead>
              <TableHead className="text-xs hidden md:table-cell">{t("admin.ts.address")}</TableHead>
              <TableHead className="text-xs text-center">{t("admin.ts.clockin")}</TableHead>
              <TableHead className="text-xs text-center">{t("admin.ts.clockout")}</TableHead>
              <TableHead className="text-xs text-center">{t("admin.ts.break")}</TableHead>
              <TableHead className="text-xs text-center">{t("admin.ts.hours")}</TableHead>
              <TableHead className="text-xs hidden md:table-cell">{t("admin.ts.notes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> {t("admin.ts.loading")}
                </TableCell>
              </TableRow>
            ) : expandedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {t("admin.ts.nodata")}
                </TableCell>
              </TableRow>
            ) : (
              expandedRows.map((r, i) => {
                const hours = Math.floor(r.totalMins / 60);
                const mins = r.totalMins % 60;
                return (
                  <TableRow key={`${r.entryId}-${r.cleanerId}-${i}`}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs font-medium">
                          {r.cleanerName}
                        </Badge>
                        {r.sharedWith > 1 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Users className="w-3 h-3" />{r.sharedWith}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.date}</TableCell>
                    <TableCell className="text-sm font-medium">{r.customerName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{r.address}</TableCell>
                    <TableCell className="text-sm text-center font-mono">{r.clockIn}</TableCell>
                    <TableCell className="text-sm text-center font-mono">{r.clockOut}</TableCell>
                    <TableCell className="text-sm text-center">{r.breakMins}m</TableCell>
                    <TableCell className="text-sm text-center font-semibold text-accent">
                      {hours}h {mins}m
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[150px] truncate">
                      {r.notes || "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TimesheetsTab;
