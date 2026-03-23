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
import { Clock, RefreshCw, Calendar, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { JobTimeEntry, Cleaner, Booking } from "./shared/types";

type EntryWithBooking = JobTimeEntry & { booking?: Booking };

const TimesheetsTab = () => {
  const [entries, setEntries] = useState<EntryWithBooking[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanerFilter, setCleanerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [entriesRes, cleanersRes, bookingsRes] = await Promise.all([
      supabase.from("job_time_entries").select("*").not("stopped_at", "is", null).order("started_at", { ascending: false }),
      supabase.from("cleaners").select("id, name, active").order("name"),
      supabase.from("bookings").select("id, name, street, city, zip, service_type"),
    ]);

    const allCleaners = (cleanersRes.data || []) as Cleaner[];
    setCleaners(allCleaners);

    const bookingsMap = new Map<string, Booking>();
    for (const b of (bookingsRes.data || []) as Booking[]) {
      bookingsMap.set(b.id, b);
    }

    const raw = ((entriesRes.data || []) as any[]) as JobTimeEntry[];
    setEntries(raw.map((e) => ({ ...e, booking: bookingsMap.get(e.booking_id) })));
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
        if (!Array.isArray(e.cleaners) || !e.cleaners.includes(cleanerFilter)) return false;
      }
      if (dateFrom && e.started_at && new Date(e.started_at) < new Date(dateFrom)) return false;
      if (dateTo && e.started_at && new Date(e.started_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [entries, cleanerFilter, dateFrom, dateTo]);

  const computeSummary = (filterFn: (e: EntryWithBooking) => boolean) => {
    const subset = entries.filter(filterFn);
    const cleanerMap = new Map<string, { jobs: number; totalMins: number }>();

    for (const e of subset) {
      const ids = Array.isArray(e.cleaners) && e.cleaners.length > 0 ? e.cleaners : ["unassigned"];
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
    const lines = ["Cleaner\tJobs\tTotal Hours\tAvg Hours/Job"];
    for (const r of data) {
      lines.push(`${r.cleanerName}\t${r.jobs}\t${r.totalHours}\t${r.avgHours}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copied!", description: "Summary copied to clipboard for payroll" });
  };

  const SummaryTable = ({ title, data }: { title: string; data: typeof weekSummary }) => (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {data.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(data)} className="h-6 text-[10px] gap-1">
            <Copy className="w-3 h-3" /> Copy
          </Button>
        )}
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">No entries</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Cleaner</TableHead>
              <TableHead className="text-xs text-center">Jobs</TableHead>
              <TableHead className="text-xs text-center">Total Hours</TableHead>
              <TableHead className="text-xs text-center">Avg Hours/Job</TableHead>
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
        <SummaryTable title="📅 This Week" data={weekSummary} />
        <SummaryTable title="📆 This Month" data={monthSummary} />
        <SummaryTable title="🔍 Custom Range" data={customSummary} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 items-center">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="w-[150px]"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="w-[150px]"
          />
        </div>
        {cleaners.length > 0 && (
          <Select value={cleanerFilter} onValueChange={setCleanerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Cleaners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cleaners</SelectItem>
              {cleaners.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Detailed Entries */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Address</TableHead>
              <TableHead className="text-xs">Cleaners</TableHead>
              <TableHead className="text-xs text-center">Clock In</TableHead>
              <TableHead className="text-xs text-center">Clock Out</TableHead>
              <TableHead className="text-xs text-center">Break</TableHead>
              <TableHead className="text-xs text-center">Total</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No time entries found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => {
                const hours = Math.floor((e.total_worked_minutes || 0) / 60);
                const mins = (e.total_worked_minutes || 0) % 60;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">
                      {e.started_at ? new Date(e.started_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {e.booking?.name || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      {e.booking ? `${e.booking.street}, ${e.booking.city}` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(e.cleaners) && e.cleaners.length > 0
                          ? e.cleaners.map((cid) => (
                              <Badge key={cid} variant="outline" className="text-[10px]">
                                {getCleanerName(cid)}
                              </Badge>
                            ))
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-center font-mono">
                      {e.started_at ? new Date(e.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-center font-mono">
                      {e.stopped_at ? new Date(e.stopped_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-center">
                      {e.total_paused_minutes || 0}m
                    </TableCell>
                    <TableCell className="text-sm text-center font-semibold text-accent">
                      {hours}h {mins}m
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[150px] truncate">
                      {e.notes || "—"}
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
