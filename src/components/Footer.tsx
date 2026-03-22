import { MapPin, Phone, Mail, Facebook } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import yelpLogo from "@/assets/yelp-logo.png";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-primary text-primary-foreground border-t border-primary-foreground/10">
      <div className="container mx-auto px-6 md:px-12 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <h3 className="font-display text-2xl mb-3">
              <span className="text-accent">Maid</span> For Chico
            </h3>
            <p className="font-body font-light text-primary-foreground/60 text-sm leading-relaxed">
              {t("footer.desc")}
            </p>
          </div>

          <div>
            <h4 className="font-body text-[11px] uppercase tracking-[0.2em] text-primary-foreground/50 mb-4">{t("footer.contact")}</h4>
            <div className="space-y-3 text-sm font-body font-light text-primary-foreground/70">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                <span>Chico, CA</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-accent" />
                <span>(530) 966-0752</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent" />
                <span>info@maidforchico.com</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-body text-[11px] uppercase tracking-[0.2em] text-primary-foreground/50 mb-4">{t("footer.links")}</h4>
            <div className="space-y-2 text-sm font-body font-light">
              <a href="/" className="block text-primary-foreground/70 hover:text-accent transition-colors">{t("nav.home")}</a>
              <a href="/#services" className="block text-primary-foreground/70 hover:text-accent transition-colors">{t("nav.services")}</a>
              <a href="/schedule" className="block text-primary-foreground/70 hover:text-accent transition-colors">{t("nav.schedule")}</a>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="http://facebook.com/maidforchico/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/50 hover:text-accent transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/maid_for_chico?igsh=NTc4MTIwNjQ2YQ=="
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/50 hover:text-accent transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a
                href="https://www.yelp.com/biz/maid-for-chico-chico"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/50 hover:text-accent transition-colors"
                aria-label="Yelp"
              >
                <svg className="w-4 h-4" viewBox="0 0 384 512" fill="currentColor"><path d="M42.9 240.32l99.62 48.61c19.2 9.4 16.2 37.51-4.5 42.71L30.5 358.45a22.79 22.79 0 0 1-28.21-19.6 197.16 197.16 0 0 1 9-85.32 22.8 22.8 0 0 1 31.61-13.21zm44 239.25a199.45 199.45 0 0 0 79.42 32.11A22.78 22.78 0 0 0 192.94 490l3.54-110.99c.57-17.85-21.74-26.65-32.56-12.84L100.69 446.3a22.77 22.77 0 0 0-13.79 33.27zm62.44-354.18l-67.42 80.65c-11.47 13.73 1.24 34.12 18.42 29.53l105.15-28.12a22.8 22.8 0 0 0 14.62-30.38A196.92 196.92 0 0 0 178 109.2a22.82 22.82 0 0 0-28.66 16.19zm242.12 121.34a22.8 22.8 0 0 0-18.09-23.41l-110.07-20.13c-17.59-3.22-29.46 18.24-17.27 31.21l75.07 79.72a22.79 22.79 0 0 0 34.18 1.46 197.88 197.88 0 0 0 36.18-68.85zm-150.87 119.87l-42.46 103.48a22.8 22.8 0 0 0 15.25 30.30 197.35 197.35 0 0 0 85.59-1.56 22.8 22.8 0 0 0 13.27-33.13l-41.16-106.12c-7.68-19.82-37.78-14.97-30.49 6.03z"/></svg>
                <span className="text-xs font-bold leading-none">Yelp</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-primary-foreground/10 text-center text-xs font-body font-light text-primary-foreground/40">
          © {new Date().getFullYear()} Maid For Chico. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
