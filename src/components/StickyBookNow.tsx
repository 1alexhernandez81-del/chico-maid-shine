import { CalendarCheck } from "lucide-react";
import { useState, useEffect } from "react";

const StickyBookNow = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past the hero section (~85vh)
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <a
      href="/schedule"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-accent text-accent-foreground px-5 py-3 rounded-full shadow-lg hover:scale-105 transition-transform font-body text-xs uppercase tracking-[0.15em] animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <CalendarCheck className="w-4 h-4" />
      Book Now
    </a>
  );
};

export default StickyBookNow;