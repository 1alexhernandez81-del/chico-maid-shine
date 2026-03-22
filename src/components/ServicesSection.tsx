import { Building2, Home, HardHat, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ServicesSection = () => {
  const { t } = useLanguage();

  const services = [
    { icon: Building2, title: t("services.commercial"), description: t("services.commercial.desc") },
    { icon: Home, title: t("services.residential"), description: t("services.residential.desc") },
    { icon: HardHat, title: t("services.construction"), description: t("services.construction.desc") },
    { icon: Sparkles, title: t("services.onetime"), description: t("services.onetime.desc") },
  ];

  return (
    <section id="services" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6 md:px-12">
        <div className="mb-16">
          <h2 className="font-display text-[clamp(2.5rem,5vw,5rem)] leading-[0.95] text-accent mb-4">
            {t("services.title")}
          </h2>
          <p className="font-body font-light text-muted-foreground text-lg max-w-xl">
            {t("services.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          {services.map((service) => (
            <div key={service.title} className="group">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center border border-accent/30 rounded-sm group-hover:border-accent transition-colors">
                  <service.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-2xl text-foreground mb-2">{service.title}</h3>
                  <p className="font-body font-light text-muted-foreground text-sm leading-relaxed">{service.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
