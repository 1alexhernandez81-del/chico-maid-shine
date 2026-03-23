import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Play, Pause, Square, Clock, Edit2, X, Loader2 } from "lucide-react";
import type { UserRole } from "@/pages/AdminDashboard";
import type { Cleaner, JobTimeEntry } from "./shared/types";

type TimerState = "idle" | "running" | "paused" | "completed";

interface JobTimerProps {
  bookingId: string;
  userRole: UserRole;
  cleaners: Cleaner[];
  assignedCleaners?: string[];
}

const JobTimer = ({ bookingId, userRole, cleaners, assignedCleaners = [] }: JobTimerProps) => {
  const { toast } = useToast();
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [entry, setEntry] = useState<JobTimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [showCleanerPicker, setShowCleanerPicker] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ startTime: "", stopTime: "", breakMinutes: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedAccumulatorRef = useRef(0);

  const isAdmin = userRole === "admin";

  // Fetch existing entry for this booking
  const fetchEntry = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_time_entries")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const e = data[0] as any as JobTimeEntry;
      setEntry(e);
      if (e.stopped_at) {
        setTimerState("completed");
      } else if (e.paused_at) {
        setTimerState("paused");
        pausedAccumulatorRef.current = e.total_paused_minutes || 0;
      } else if (e.started_at) {
        setTimerState("running");
        pausedAccumulatorRef.current = e.total_paused_minutes || 0;
      }
      setSelectedCleaners(Array.isArray(e.cleaners) ? e.cleaners : []);
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => { fetchEntry(); }, [fetchEntry]);

  // Live timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (timerState === "running" && entry?.started_at) {
      const updateElapsed = () => {
        const startMs = new Date(entry.started_at!).getTime();
        const nowMs = Date.now();
        const totalSeconds = Math.floor((nowMs - startMs) / 1000);
        const pausedSeconds = pausedAccumulatorRef.current * 60;
        setElapsed(Math.max(0, totalSeconds - pausedSeconds));
      };
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
    } else if (timerState === "paused" && entry?.started_at && entry?.paused_at) {
      const startMs = new Date(entry.started_at).getTime();
      const pausedMs = new Date(entry.paused_at).getTime();
      const totalSeconds = Math.floor((pausedMs - startMs) / 1000);
      const pausedSeconds = pausedAccumulatorRef.current * 60;
      setElapsed(Math.max(0, totalSeconds - pausedSeconds));
    } else if (timerState === "completed" && entry) {
      setElapsed((entry.total_worked_minutes || 0) * 60);
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerState, entry]);

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStartClock = () => {
    if (cleaners.length > 0) {
      setShowCleanerPicker(true);
    } else {
      startClock([]);
    }
  };

  const startClock = async (cleanerIds: string[]) => {
    setShowCleanerPicker(false);
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("job_time_entries")
      .insert({
        booking_id: bookingId,
        started_at: now,
        cleaners: cleanerIds,
        created_by: session?.user?.id || null,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to start clock", variant: "destructive" });
    } else {
      setEntry(data as any as JobTimeEntry);
      setSelectedCleaners(cleanerIds);
      setTimerState("running");
      pausedAccumulatorRef.current = 0;
      toast({ title: "⏱️ Clock Started", description: "Timer is running" });
    }
    setSaving(false);
  };

  const handlePause = async () => {
    if (!entry) return;
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("job_time_entries")
      .update({ paused_at: now } as any)
      .eq("id", entry.id);

    if (!error) {
      setEntry((prev) => prev ? { ...prev, paused_at: now } : prev);
      setTimerState("paused");
      toast({ title: "⏸️ Paused" });
    }
    setSaving(false);
  };

  const handleResume = async () => {
    if (!entry || !entry.paused_at) return;
    setSaving(true);
    const now = new Date();
    const pausedAt = new Date(entry.paused_at);
    const addedPauseMins = Math.floor((now.getTime() - pausedAt.getTime()) / 60000);
    const newTotalPaused = (entry.total_paused_minutes || 0) + addedPauseMins;
    pausedAccumulatorRef.current = newTotalPaused;

    const { error } = await supabase
      .from("job_time_entries")
      .update({
        paused_at: null,
        resumed_at: now.toISOString(),
        total_paused_minutes: newTotalPaused,
      } as any)
      .eq("id", entry.id);

    if (!error) {
      setEntry((prev) => prev ? { ...prev, paused_at: null, resumed_at: now.toISOString(), total_paused_minutes: newTotalPaused } : prev);
      setTimerState("running");
      toast({ title: "▶️ Resumed" });
    }
    setSaving(false);
  };

  const handleStop = async () => {
    if (!entry || !entry.started_at) return;
    setSaving(true);
    const now = new Date();

    // If currently paused, add pause time
    let finalPaused = entry.total_paused_minutes || 0;
    if (entry.paused_at) {
      const pausedAt = new Date(entry.paused_at);
      finalPaused += Math.floor((now.getTime() - pausedAt.getTime()) / 60000);
    }

    const startMs = new Date(entry.started_at).getTime();
    const totalMinutes = Math.floor((now.getTime() - startMs) / 60000);
    const workedMinutes = Math.max(0, totalMinutes - finalPaused);

    const { error } = await supabase
      .from("job_time_entries")
      .update({
        stopped_at: now.toISOString(),
        paused_at: null,
        total_paused_minutes: finalPaused,
        total_worked_minutes: workedMinutes,
      } as any)
      .eq("id", entry.id);

    if (!error) {
      setEntry((prev) => prev ? {
        ...prev,
        stopped_at: now.toISOString(),
        paused_at: null,
        total_paused_minutes: finalPaused,
        total_worked_minutes: workedMinutes,
      } : prev);
      setTimerState("completed");
      toast({ title: "⏹️ Clock Stopped", description: `Total: ${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m` });
    }
    setSaving(false);
  };

  const canEdit = () => {
    if (isAdmin) return true;
    if (!entry?.stopped_at) return false;
    const stoppedAt = new Date(entry.stopped_at);
    const hoursSince = (Date.now() - stoppedAt.getTime()) / (1000 * 60 * 60);
    return hoursSince <= 24;
  };

  const openEdit = () => {
    if (!entry) return;
    setEditData({
      startTime: entry.started_at ? new Date(entry.started_at).toISOString().slice(0, 16) : "",
      stopTime: entry.stopped_at ? new Date(entry.stopped_at).toISOString().slice(0, 16) : "",
      breakMinutes: String(entry.total_paused_minutes || 0),
      notes: entry.notes || "",
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!entry) return;
    setSaving(true);

    const startMs = new Date(editData.startTime).getTime();
    const stopMs = new Date(editData.stopTime).getTime();
    const breakMins = parseInt(editData.breakMinutes) || 0;
    const totalMinutes = Math.floor((stopMs - startMs) / 60000);
    const workedMinutes = Math.max(0, totalMinutes - breakMins);

    const { error } = await supabase
      .from("job_time_entries")
      .update({
        started_at: new Date(editData.startTime).toISOString(),
        stopped_at: new Date(editData.stopTime).toISOString(),
        total_paused_minutes: breakMins,
        total_worked_minutes: workedMinutes,
        notes: editData.notes || null,
      } as any)
      .eq("id", entry.id);

    if (!error) {
      setEntry((prev) => prev ? {
        ...prev,
        started_at: new Date(editData.startTime).toISOString(),
        stopped_at: new Date(editData.stopTime).toISOString(),
        total_paused_minutes: breakMins,
        total_worked_minutes: workedMinutes,
        notes: editData.notes || null,
      } : prev);
      toast({ title: "✅ Time Entry Updated" });
      setShowEdit(false);
    } else {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading timer...
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Time Tracking
      </label>

      {timerState === "idle" && (
        <Button
          onClick={handleStartClock}
          disabled={saving}
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Start Clock
        </Button>
      )}

      {(timerState === "running" || timerState === "paused") && (
        <div className="space-y-3">
          {/* Timer display */}
          <div className={`text-center py-4 rounded-lg border ${timerState === "running" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
            <p className="text-3xl font-mono font-bold tracking-wider">
              {formatElapsed(elapsed)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              {timerState === "running" ? "⏱️ Running" : "⏸️ Paused"}
            </p>
          </div>

          {/* Assigned cleaners display */}
          {selectedCleaners.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedCleaners.map((id) => {
                const c = cleaners.find((cl) => cl.id === id);
                return c ? (
                  <Badge key={id} variant="outline" className="text-xs">
                    {c.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2">
            {timerState === "running" ? (
              <Button onClick={handlePause} disabled={saving} variant="outline" className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                Pause
              </Button>
            ) : (
              <Button onClick={handleResume} disabled={saving} variant="outline" className="gap-2 border-emerald-500/30 text-emerald-400">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Resume
              </Button>
            )}
            <Button onClick={handleStop} disabled={saving} variant="outline" className="gap-2 border-destructive/30 text-destructive">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Stop Clock
            </Button>
          </div>
        </div>
      )}

      {timerState === "completed" && entry && (
        <div className="space-y-3">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">✅ Completed</p>
              {canEdit() && (
                <Button variant="ghost" size="sm" onClick={openEdit} className="h-7 text-xs gap-1">
                  <Edit2 className="w-3 h-3" /> Edit Time
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Clock In</p>
                <p className="font-medium">{entry.started_at ? new Date(entry.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Clock Out</p>
                <p className="font-medium">{entry.stopped_at ? new Date(entry.stopped_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Break</p>
                <p className="font-medium">{entry.total_paused_minutes || 0}m</p>
              </div>
            </div>
            <div className="border-t border-border pt-2">
              <p className="text-lg font-semibold text-accent">
                {Math.floor((entry.total_worked_minutes || 0) / 60)}h {(entry.total_worked_minutes || 0) % 60}m
              </p>
              <p className="text-[10px] uppercase text-muted-foreground">Total Worked</p>
            </div>
            {entry.notes && (
              <p className="text-xs text-muted-foreground italic">{entry.notes}</p>
            )}
            {selectedCleaners.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedCleaners.map((id) => {
                  const c = cleaners.find((cl) => cl.id === id);
                  return c ? (
                    <Badge key={id} variant="outline" className="text-xs">
                      {c.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cleaner Picker Dialog */}
      <Dialog open={showCleanerPicker} onOpenChange={setShowCleanerPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Cleaners</DialogTitle>
            <DialogDescription>Choose the crew members for this job</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {cleaners.filter((c) => c.active).map((c) => (
              <label key={c.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCleaners.includes(c.id)}
                  onChange={() => {
                    setSelectedCleaners((prev) =>
                      prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                    );
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">{c.name}</span>
              </label>
            ))}
            {cleaners.filter((c) => c.active).length === 0 && (
              <p className="text-sm text-muted-foreground">No active cleaners</p>
            )}
            <Button
              onClick={() => startClock(selectedCleaners)}
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Clock {selectedCleaners.length > 0 ? `(${selectedCleaners.length} cleaners)` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Time Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>Adjust the time entry manually</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Start Time</label>
              <Input
                type="datetime-local"
                value={editData.startTime}
                onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Stop Time</label>
              <Input
                type="datetime-local"
                value={editData.stopTime}
                onChange={(e) => setEditData({ ...editData, stopTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Break (minutes)</label>
              <Input
                type="number"
                value={editData.breakMinutes}
                onChange={(e) => setEditData({ ...editData, breakMinutes: e.target.value })}
                min="0"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Notes</label>
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <Button onClick={saveEdit} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobTimer;
