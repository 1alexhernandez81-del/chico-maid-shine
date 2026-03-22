import { Star, Phone, Shield, Clock, CheckCircle, MapPin, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";

const PHONE_NUMBER = "5309660752";
const WHATSAPP_NUMBER = "15309660752";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I'm interested in your cleaning services.")}`;

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/Maid+For+Chico/@39.7238225,-122.007554,9z/data=!4m8!3m7!1s0x8082d9f21b5035d3:0x189f9dfb3b334fcb!8m2!3d39.7238225!4d-122.007554!9m1!1b1!16s%2Fg%2F11ghnxkzp4";

const LandingAds = () => {
  const { t } = useLanguage();

  useEffect(() => {
    // Track landing page visit for ads conversion
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "page_view", { page_title: "Google Ads Landing" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal header — no nav distractions */}
      <header className="border-b border-border px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <span className="font-display text-2xl tracking-tight">
            <span className="text-accent">Maid</span> For Chico
          </span>
          <a
            href={`tel:${PHONE_NUMBER}`}
            className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-md text-xs uppercase tracking-[0.12em] font-body hover:bg-accent/90 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            {t("ads.callnow")}
          </a>
        </div>
      </header>

      {/* Hero — single clear message + CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-accent text-accent" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground font-body">4.7 stars · 37 reviews</span>
          </div>

          <h1 className="font-display font-black text-[clamp(2.5rem,6vw,5rem)] leading-[0.92] mb-6 text-foreground" style={{ overflowWrap: "break-word" }}>
            {t("ads.headline")}
          </h1>
          <p className="font-body font-light text-foreground/60 text-lg mb-10 max-w-2xl leading-relaxed">
            {t("ads.subheadline")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <a
              href="/schedule"
              className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-8 py-4 font-body text-sm uppercase tracking-[0.12em] rounded-md hover:bg-accent/90 transition-colors"
            >
              {t("ads.cta")}
            </a>
            <a
              href={`tel:${PHONE_NUMBER}`}
              className="inline-flex items-center justify-center gap-2 border border-accent text-accent px-8 py-4 font-body text-sm uppercase tracking-[0.12em] rounded-md hover:bg-accent/10 transition-colors"
            >
              <Phone className="w-4 h-4" />
              (530) 966-0752
            </a>
          </div>

          {/* Trust badges row */}
          <div className="flex flex-wrap gap-6 text-sm font-body text-foreground/50">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <span>{t("ads.licensed")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <span>{t("ads.insured")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span>{t("ads.sameday")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span>Chico, CA</span>
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl">
          <h2 className="font-display text-3xl md:text-4xl mb-10 text-accent">{t("ads.included")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              t("ads.item1"), t("ads.item2"), t("ads.item3"), t("ads.item4"),
              t("ads.item5"), t("ads.item6"), t("ads.item7"), t("ads.item8"),
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 py-3">
                <CheckCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <span className="font-body font-light text-foreground/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl">
          <h2 className="font-display text-3xl md:text-4xl mb-10 text-accent">{t("ads.reviews")}</h2>
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {[
              {
                name: "Cheyenne T.",
                text: "Betty and her team are absolutely incredible! I come home on the days they clean and my house smells so good! They don't use harsh chemicals, and still make my dirty floors spotless.",
              },
              {
                name: "Robert",
                text: "Betty and her team are great! They do an excellent job in general and are conscious of pets too while they work. I've had them regularly come over for about a year now.",
              },
            ].map((review) => (
              <div key={review.name} className="border border-border p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="font-body font-light text-foreground/70 text-sm leading-relaxed mb-4 italic">
                  "{review.text}"
                </p>
                <span className="font-body text-sm text-foreground">{review.name}</span>
              </div>
            ))}
          </div>
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:text-accent/80 transition-colors font-body underline"
          >
            {t("ads.seeall")}
          </a>
        </div>
      </section>

      {/* Promo */}
      <section className="py-16 border-t border-border bg-accent/5">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl text-center">
          <h2 className="font-display text-3xl md:text-4xl mb-4 text-accent">{t("ads.promo")}</h2>
          <p className="font-body font-light text-foreground/60 mb-8 max-w-lg mx-auto">
            {t("ads.promodesc")}
          </p>
          <a
            href="/schedule"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-4 font-body text-sm uppercase tracking-[0.12em] rounded-md hover:bg-accent/90 transition-colors"
          >
            {t("ads.cta")}
          </a>
        </div>
      </section>

      {/* Sticky bottom CTA (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border px-4 py-3 flex gap-3">
        <a
          href="/schedule"
          className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground py-3 rounded-md font-body text-xs uppercase tracking-[0.12em]"
        >
          {t("ads.booknow")}
        </a>
        <a
          href={`tel:${PHONE_NUMBER}`}
          className="flex items-center justify-center gap-2 border border-accent text-accent px-4 py-3 rounded-md"
        >
          <Phone className="w-4 h-4" />
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-md"
        >
          <MessageCircle className="w-4 h-4" />
        </a>
      </div>

      {/* Footer — minimal */}
      <footer className="py-8 border-t border-border text-center">
        <p className="text-xs font-body text-muted-foreground">
          © {new Date().getFullYear()} Maid For Chico · Chico, CA · (530) 966-0752
        </p>
      </footer>
    </div>
  );
};

export default LandingAds;
