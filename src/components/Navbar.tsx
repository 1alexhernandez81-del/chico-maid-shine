import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { lang, toggleLang, t } = useLanguage();

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/#services", label: t("nav.services") },
    { to: "/blog", label: t("nav.blog") },
    { to: "/schedule", label: t("nav.schedule") },
  ];

  const handleNavClick = (to: string) => {
    setMobileOpen(false);
    if (to.startsWith("/#")) {
      const id = to.slice(2);
      if (location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-3xl tracking-tight">
            <span className="text-accent">Maid</span>{" "}
            <span className="text-foreground">For Chico</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to.startsWith("/#") ? "/" : link.to}
              onClick={() => link.to.startsWith("/#") && handleNavClick(link.to)}
              className="text-[11px] font-body font-normal uppercase tracking-[0.2em] text-accent hover:text-accent/80 transition-colors"
            >
              {link.label}
            </Link>
          ))}

          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-foreground/50 hover:text-accent transition-colors border border-border rounded px-2.5 py-1.5 hover:border-accent"
            aria-label="Toggle language"
          >
            <span className="text-base leading-none">{lang === "en" ? "🇲🇽" : "🇺🇸"}</span>
            <span>{lang === "en" ? "Español" : "English"}</span>
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border px-6 py-4 space-y-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to.startsWith("/#") ? "/" : link.to}
              onClick={() => {
                if (link.to.startsWith("/#")) handleNavClick(link.to);
                else setMobileOpen(false);
              }}
              className="block py-1 text-[11px] uppercase tracking-[0.2em] font-body text-accent hover:text-accent/80 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-foreground/50 hover:text-accent transition-colors border border-border rounded px-2.5 py-1.5 hover:border-accent"
          >
            <span className="text-base leading-none">{lang === "en" ? "🇲🇽" : "🇺🇸"}</span>
            <span>{lang === "en" ? "Español" : "English"}</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
