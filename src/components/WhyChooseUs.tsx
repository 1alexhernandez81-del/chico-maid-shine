import { ThumbsUp, Star, Smile, DollarSign } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const WhyChooseUs = () => {
  const { t } = useLanguage();

  const reasons = [
    { icon: ThumbsUp, title: t("why.satisfaction"), description: t("why.satisfaction.desc") },
    { icon: Star, title: t("why.quality"), description: t("why.quality.desc") },
    { icon: Smile, title: t("why.stressfree"), description: t("why.stressfree.desc") },
    { icon: DollarSign, title: t("why.budget"), description: t("why.budget.desc") },
  ];

  return (
    <section className="py-24 md:py-32 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 md:px-12">
        <h2 className="font-display text-[clamp(2.5rem,5vw,5rem)] leading-[0.95] text-accent mb-16">
          {t("why.title")}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {reasons.map((reason) => (
            <div key={reason.title}>
              <div className="w-12 h-12 flex items-center justify-center border border-accent/30 rounded-sm mb-5">
                <reason.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-display text-xl text-primary-foreground mb-2">{reason.title}</h3>
              <p className="font-body font-light text-primary-foreground/65 text-sm leading-relaxed">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
