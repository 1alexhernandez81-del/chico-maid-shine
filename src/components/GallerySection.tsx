import { useLanguage } from "@/contexts/LanguageContext";
import beforeWasher from "@/assets/gallery/before-washer.jpg";
import afterWasher from "@/assets/gallery/after-washer.jpg";
import beforeShower from "@/assets/gallery/before-shower.jpg";
import afterShower from "@/assets/gallery/after-shower.jpg";
import beforeKitchen from "@/assets/gallery/before-kitchen.jpg";
import afterKitchen from "@/assets/gallery/after-kitchen.jpg";

const beforeAfterPairs = [
  {
    before: beforeWasher,
    after: afterWasher,
    label: "Washer Room Deep Clean",
  },
  {
    before: beforeShower,
    after: afterShower,
    label: "Bathroom Shower Restoration",
  },
  {
    before: afterKitchen,
    after: beforeKitchen,
    label: "Kitchen Appliance Area Clean",
  },
];

const GallerySection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 md:py-32 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 md:px-12">
        <div className="mb-16">
          <h2 className="font-display text-[clamp(2.5rem,5vw,5rem)] leading-[0.95] text-accent mb-4">
            {t("gallery.title")}
          </h2>
          <p className="font-body font-light text-primary-foreground/60 text-lg max-w-xl">
            {t("gallery.subtitle")}
          </p>
        </div>

        <div className="space-y-12">
          {beforeAfterPairs.map((pair, i) => (
            <div key={i} className="border border-primary-foreground/10 rounded-lg overflow-hidden">
              <div className="grid md:grid-cols-2">
                {/* Before */}
                <div className="relative aspect-[4/3]">
                  <img
                    src={pair.before}
                    alt={`Before - ${pair.label}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-4 left-4 bg-background/90 text-foreground text-xs font-body uppercase tracking-[0.15em] px-3 py-1.5 rounded-md">
                    Before
                  </span>
                </div>
                {/* After */}
                <div className="relative aspect-[4/3]">
                  <img
                    src={pair.after}
                    alt={`After - ${pair.label}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-4 left-4 bg-accent text-accent-foreground text-xs font-body uppercase tracking-[0.15em] px-3 py-1.5 rounded-md">
                    After
                  </span>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-primary-foreground/10">
                <span className="font-display text-lg text-primary-foreground">{pair.label}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="font-body font-light text-primary-foreground/40 text-sm mt-10 italic">
        </p>
      </div>
    </section>
  );
};

export default GallerySection;
