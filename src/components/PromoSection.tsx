import { Gift, Share2, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const PromoSection = () => {
  const { lang: language } = useLanguage();

  return (
    <section className="py-20 md:py-28 bg-card border-y border-border">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24">
          {/* First-Time Customer Offer */}
          <div className="relative">
            <span className="inline-block bg-accent text-accent-foreground text-[10px] uppercase tracking-[0.2em] font-body px-4 py-1.5 rounded-sm mb-8">
              {language === "es" ? "Oferta Especial" : "Special Offer"}
            </span>
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-accent" />
              <h3 className="font-display text-2xl md:text-3xl text-foreground">
                {language === "es" ? "15% de Descuento" : "15% Off"}
              </h3>
            </div>
            <p className="font-display text-lg text-accent mb-3">
              {language === "es"
                ? "Tu Primera Limpieza (hasta $50)"
                : "Your First Cleaning (up to $50)"}
            </p>
            <p className="font-body font-light text-sm text-muted-foreground mb-8 leading-relaxed max-w-md">
              {language === "es"
                ? "¡Nuevos clientes reciben 15% de descuento (hasta $50) en su primer servicio de limpieza! Menciona esta oferta al reservar."
                : "New customers get 15% off their first cleaning service (up to $50)! Just mention this offer when you book."}
            </p>
            <a
              href="/schedule"
              className="inline-block bg-accent text-accent-foreground px-8 py-3 font-body text-xs uppercase tracking-[0.15em] rounded-sm hover:bg-accent/85 transition-all duration-300"
            >
              {language === "es" ? "Reservar Ahora" : "Book Now"}
            </a>
          </div>

          {/* Referral Program */}
          <div className="relative">
            <span className="inline-block bg-accent text-accent-foreground text-[10px] uppercase tracking-[0.2em] font-body px-4 py-1.5 rounded-sm mb-8">
              {language === "es" ? "Programa de Referidos" : "Referral Program"}
            </span>
            <div className="flex items-center gap-3 mb-4">
              <Share2 className="w-6 h-6 text-accent" />
              <h3 className="font-display text-2xl md:text-3xl text-foreground">
                {language === "es" ? "Recomienda y Ahorra" : "Refer & Save"}
              </h3>
            </div>
            <p className="font-body font-light text-sm text-muted-foreground mb-6 leading-relaxed max-w-md">
              {language === "es"
                ? "¡Comparte el amor por la limpieza! Recomienda a un amigo y ambos reciben una recompensa."
                : "Share the clean! Refer a friend and you both get rewarded."}
            </p>
            <div className="space-y-3.5 mb-8">
              {[
                {
                  en: "You get $25 off your next cleaning of $150 or more",
                  es: "Tú recibes $25 de descuento en tu próxima limpieza de $150 o más",
                },
                {
                  en: "Your friend gets 15% off their first service",
                  es: "Tu amigo recibe 15% de descuento en su primer servicio",
                },
                {
                  en: "No limit on referrals!",
                  es: "¡Sin límite de referidos!",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <p className="font-body text-sm text-foreground/70">
                    {language === "es" ? item.es : item.en}
                  </p>
                </div>
              ))}
            </div>
            <a
              href="/refer"
              className="inline-block bg-accent text-accent-foreground px-8 py-3 font-body text-xs uppercase tracking-[0.15em] rounded-sm hover:bg-accent/85 transition-all duration-300"
            >
              {language === "es" ? "Compartir Enlace" : "Share Your Link"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoSection;
