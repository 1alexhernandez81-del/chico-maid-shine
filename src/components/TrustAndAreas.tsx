import { ShieldCheck, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const serviceAreas = [
  "Chico",
  "Paradise",
  "Oroville",
  "Durham",
  "Magalia",
  "Forest Ranch",
  "Biggs",
  "Gridley",
];

const TrustAndAreas = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 md:py-32 bg-secondary">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-2 gap-16">
          {/* Trust Badges */}
          <div>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-[0.95] text-accent mb-8">
              {t("trust.title")}
            </h2>
            <div className="space-y-6">
              {[
                { label: t("trust.licensed"), desc: t("trust.licensed.desc") },
                { label: t("trust.insured"), desc: t("trust.insured.desc") },
                { label: t("trust.bonded"), desc: t("trust.bonded.desc") },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-md bg-accent/15 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground mb-1">{item.label}</h3>
                    <p className="font-body font-light text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Areas */}
          <div>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-[0.95] text-accent mb-8">
              {t("areas.title")}
            </h2>
            <p className="font-body font-light text-muted-foreground text-sm mb-6 leading-relaxed">
              {t("areas.subtitle")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {serviceAreas.map((area) => (
                <div
                  key={area}
                  className="flex items-center gap-2 px-4 py-3 rounded-md border border-border hover:border-accent/40 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="font-body text-sm text-foreground">{area}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustAndAreas;
