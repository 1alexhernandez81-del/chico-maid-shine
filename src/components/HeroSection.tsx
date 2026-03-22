import { useLanguage } from "@/contexts/LanguageContext";

const HeroSection = () => {
  const { t } = useLanguage();

  return (
    <section className="bg-background">
      <div className="min-h-[85vh] flex items-end">
        <div className="px-6 md:px-12 py-20 md:py-32 max-w-4xl">
          <h1 className="font-display font-black text-[clamp(3.5rem,9vw,8rem)] leading-[0.9] mb-12 text-foreground">
            <span className="text-accent">Maid</span>{" "}
            For Chico
          </h1>
          <p className="font-body font-light text-sm md:text-base text-foreground/60 mb-3 leading-relaxed max-w-xl">
            {t("hero.tagline1")}
          </p>
          <p className="font-body font-light text-sm md:text-base text-foreground/60 mb-3 leading-relaxed max-w-xl">
            {t("hero.tagline2")}
          </p>
          <p className="font-body font-normal text-sm md:text-base text-foreground/75 mb-12 leading-relaxed max-w-xl">
            {t("hero.tagline3")}
          </p>
          <a
            href="/schedule"
            className="inline-block bg-accent text-accent-foreground px-6 py-2.5 font-body text-xs uppercase tracking-[0.15em] rounded-md hover:bg-accent/90 transition-colors"
          >
            {t("hero.cta")}
          </a>
        </div>
      </div>
    </section>
  );
};

export const LineDivider = () => (
  <div className="bg-background px-6 md:px-12">
    <div className="h-px bg-border w-full" />
  </div>
);

export default HeroSection;
