import { useState, useCallback, DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronLeft, ChevronRight, Clock, MapPin, GripVertical } from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { STATUS_COLORS } from "./shared/utils";
import type { Booking } from "./shared/types";


type CalendarMode = "day" | "week" | "month";

const STATUS_DOT: Record<string, string> = {
  approved: "bg-green-500",
  scheduled: "bg-blue-500",
  "in-progress": "bg-purple-500",
  completed: "bg-emerald-400",
};


interface JobsCalendarViewProps {
  bookings: Booking[];
  mode: CalendarMode;
  onSelectJob: (booking: Booking) => void;
  onReschedule?: (bookingId: string, newDate: string) => void;
}

function getBookingDate(b: Booking): Date {
  const dateStr = b.scheduled_date || b.preferred_date;
  return new Date(dateStr + "T12:00:00");
}

function getBookingTime(b: Booking): string {
  return b.scheduled_time || b.preferred_time || "";
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function bookingsForDay(bookings: Booking[], day: Date): Booking[] {
  return bookings
    .filter((b) => isSameDay(getBookingDate(b), day))
    .sort((a, b) => getBookingTime(a).localeCompare(getBookingTime(b)));
}

// ─── Draggable Job Card ──────────────────────────────
const JobCard = ({
  booking,
  compact = false,
  onClick,
  draggable = false,
}: {
  booking: Booking;
  compact?: boolean;
  onClick: () => void;
  draggable?: boolean;
}) => {
  const time = getBookingTime(booking);
  const service = booking.service_type.replace("-", " ");

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("text/plain", booking.id);
    e.dataTransfer.effectAllowed = "move";
    // Add a subtle visual cue
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  };

  const handleDragEnd = (e: DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  if (compact) {
    return (
      <div
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onClick}
        className={`w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight truncate hover:bg-secondary/80 transition-colors flex items-center gap-1 group ${
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        }`}
      >
        {draggable && (
          <GripVertical className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[booking.status] || "bg-muted-foreground"}`} />
        <span className="truncate">
          {time && <span className="text-muted-foreground mr-1">{time}</span>}
          {booking.name}
        </span>
      </div>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors space-y-1.5 group active:scale-[0.98] ${
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {draggable && (
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
          <span className="font-medium text-sm truncate">{booking.name}</span>
        </div>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[booking.status] || ""}`}>
          {booking.status}
        </Badge>
      </div>
      {time && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" /> {time}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate capitalize">{service} · {booking.city}</span>
      </div>
    </div>
  );
};

// ─── Drop Zone wrapper ───────────────────────────────
const DropZone = ({
  dateStr,
  onDrop,
  children,
  className = "",
}: {
  dateStr: string;
  onDrop: (bookingId: string, newDate: string) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const bookingId = e.dataTransfer.getData("text/plain");
      if (bookingId) {
        onDrop(bookingId, dateStr);
      }
    },
    [dateStr, onDrop]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${className} transition-colors duration-150 ${
        dragOver ? "!bg-accent/15 ring-2 ring-accent/40 ring-inset" : ""
      }`}
    >
      {children}
    </div>
  );
};

// ─── Day View ────────────────────────────────────────
const DayView = ({
  bookings,
  day,
  onSelectJob,
  onDrop,
}: {
  bookings: Booking[];
  day: Date;
  onSelectJob: (b: Booking) => void;
  onDrop: (bookingId: string, newDate: string) => void;
}) => {
  const dayBookings = bookingsForDay(bookings, day);
  const hours = Array.from({ length: 13 }, (_, i) => i + 7);
  const dateStr = formatDateStr(day);

  return (
    <DropZone dateStr={dateStr} onDrop={onDrop} className="border border-border rounded-lg overflow-hidden">
      {hours.map((hour) => {
        const hourStr = String(hour).padStart(2, "0");
        const hourBookings = dayBookings.filter((b) => getBookingTime(b).startsWith(hourStr + ":"));
        const label = hour <= 12 ? `${hour === 0 ? 12 : hour} AM` : `${hour - 12 || 12} PM`;

        return (
          <div key={hour} className="flex border-b border-border last:border-b-0 min-h-[56px]">
            <div className="w-20 shrink-0 py-2 px-3 text-xs text-muted-foreground border-r border-border bg-secondary/30 flex items-start">
              {label}
            </div>
            <div className="flex-1 p-1.5 space-y-1">
              {hourBookings.map((b) => (
                <JobCard key={b.id} booking={b} draggable onClick={() => onSelectJob(b)} />
              ))}
            </div>
          </div>
        );
      })}
      {dayBookings.filter((b) => !getBookingTime(b)).length > 0 && (
        <div className="border-t-2 border-dashed border-border">
          <div className="flex min-h-[48px]">
            <div className="w-20 shrink-0 py-2 px-3 text-xs text-muted-foreground border-r border-border bg-secondary/30 flex items-start">
              No time
            </div>
            <div className="flex-1 p-1.5 space-y-1">
              {dayBookings
                .filter((b) => !getBookingTime(b))
                .map((b) => (
                  <JobCard key={b.id} booking={b} draggable onClick={() => onSelectJob(b)} />
                ))}
            </div>
          </div>
        </div>
      )}
    </DropZone>
  );
};

// ─── Week View ───────────────────────────────────────
const WeekView = ({
  bookings,
  weekStart,
  onSelectJob,
  onDrop,
}: {
  bookings: Booking[];
  weekStart: Date;
  onSelectJob: (b: Booking) => void;
  onDrop: (bookingId: string, newDate: string) => void;
}) => {
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 0 }) });

  return (
    <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={`py-2 px-2 text-center text-xs font-medium border-b border-r last:border-r-0 border-border ${
            isToday(day) ? "bg-accent/10 text-accent" : "bg-secondary/50 text-muted-foreground"
          }`}
        >
          <div>{format(day, "EEE")}</div>
          <div className={`text-lg font-semibold mt-0.5 ${isToday(day) ? "text-accent" : "text-foreground"}`}>
            {format(day, "d")}
          </div>
        </div>
      ))}
      {/* Cells */}
      {days.map((day) => {
        const dayBookings = bookingsForDay(bookings, day);
        return (
          <DropZone
            key={day.toISOString() + "-cell"}
            dateStr={formatDateStr(day)}
            onDrop={onDrop}
            className={`min-h-[140px] p-1 border-r last:border-r-0 border-border space-y-0.5 ${
              isToday(day) ? "bg-accent/5" : ""
            }`}
          >
            {dayBookings.slice(0, 5).map((b) => (
              <JobCard key={b.id} booking={b} compact draggable onClick={() => onSelectJob(b)} />
            ))}
            {dayBookings.length > 5 && (
              <p className="text-[10px] text-muted-foreground text-center">+{dayBookings.length - 5} more</p>
            )}
          </DropZone>
        );
      })}
    </div>
  );
};

// ─── Month View ──────────────────────────────────────
const MonthView = ({
  bookings,
  currentDate,
  onSelectJob,
  onDrop,
}: {
  bookings: Booking[];
  currentDate: Date;
  onSelectJob: (b: Booking) => void;
  onDrop: (bookingId: string, newDate: string) => void;
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Weekday header */}
      <div className="grid grid-cols-7 bg-secondary/50">
        {weekdays.map((wd) => (
          <div key={wd} className="py-2 text-center text-xs font-medium text-muted-foreground border-b border-r last:border-r-0 border-border">
            {wd}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayBookings = bookingsForDay(bookings, day);
          const inMonth = isSameMonth(day, currentDate);
          return (
            <DropZone
              key={day.toISOString()}
              dateStr={formatDateStr(day)}
              onDrop={onDrop}
              className={`min-h-[100px] p-1 border-b border-r [&:nth-child(7n)]:border-r-0 border-border ${
                !inMonth ? "bg-secondary/20 opacity-50" : isToday(day) ? "bg-accent/5" : ""
              }`}
            >
              <div className={`text-xs font-medium mb-0.5 px-1 ${isToday(day) ? "text-accent" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayBookings.slice(0, 3).map((b) => (
                  <JobCard key={b.id} booking={b} compact draggable onClick={() => onSelectJob(b)} />
                ))}
                {dayBookings.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{dayBookings.length - 3} more</p>
                )}
              </div>
            </DropZone>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────
const JobsCalendarView = ({ bookings, mode, onSelectJob, onReschedule }: JobsCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { t } = useLanguage();

  const navigate = (dir: "prev" | "next") => {
    const fn = dir === "next"
      ? mode === "day" ? addDays : mode === "week" ? addWeeks : addMonths
      : mode === "day" ? subDays : mode === "week" ? subWeeks : subMonths;
    setCurrentDate((d) => fn(d, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  const handleDrop = useCallback(
    (bookingId: string, newDate: string) => {
      onReschedule?.(bookingId, newDate);
    },
    [onReschedule]
  );

  const headerLabel =
    mode === "day"
      ? format(currentDate, "EEEE, MMMM d, yyyy")
      : mode === "week"
        ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "MMM d")} — ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "MMM d, yyyy")}`
        : format(currentDate, "MMMM yyyy");

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("prev")} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate("next")} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs h-8">
            {t("admin.calendar.today")}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-muted-foreground hidden sm:block">{t("admin.calendar.drag")}</p>
          <h3 className="text-sm font-semibold text-foreground">{headerLabel}</h3>
        </div>
      </div>

      {/* View */}
      {mode === "day" && <DayView bookings={bookings} day={currentDate} onSelectJob={onSelectJob} onDrop={handleDrop} />}
      {mode === "week" && (
        <WeekView
          bookings={bookings}
          weekStart={startOfWeek(currentDate, { weekStartsOn: 0 })}
          onSelectJob={onSelectJob}
          onDrop={handleDrop}
        />
      )}
      {mode === "month" && <MonthView bookings={bookings} currentDate={currentDate} onSelectJob={onSelectJob} onDrop={handleDrop} />}
    </div>
  );
};

export default JobsCalendarView;
