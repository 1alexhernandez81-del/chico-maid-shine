export const formatTime12 = (time: string | null | undefined): string => {
  if (!time) return "TBD";

  const trimmed = time.trim();
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;

  const [h, m] = trimmed.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "TBD";

  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
};

export const toDateInputValue = (value: string | null | undefined): string => {
  if (!value) return "";

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const normalized = trimmed.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
};

export const toTimeInputValue = (value: string | null | undefined): string => {
  if (!value) return "";

  const trimmed = value.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : "";
};

export const formatLabel = (value: string | null | undefined, fallback = "\u2014") => {
  if (!value || typeof value !== "string") return fallback;
  const cleaned = value.trim();
  return cleaned ? cleaned.replace(/-/g, " ") : fallback;
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  contacted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "estimate-scheduled": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  quoted: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  declined: "bg-red-500/20 text-red-400 border-red-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  scheduled: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "in-progress": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};
