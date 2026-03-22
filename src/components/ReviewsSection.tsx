import { Star, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/Maid+For+Chico/@39.7238225,-122.007554,9z/data=!4m8!3m7!1s0x8082d9f21b5035d3:0x189f9dfb3b334fcb!8m2!3d39.7238225!4d-122.007554!9m1!1b1!16s%2Fg%2F11ghnxkzp4?entry=ttu&g_ep=EgoyMDI2MDIxOC4wIKXMDSoASAFQAw%3D%3D";

const testimonials = [
  {
    name: "Cheyenne T.",
    text: "Betty and her team are absolutely incredible! I come home on the days they clean and my house smells so good! They don't use harsh chemicals, and still make my dirty floors spotless.",
    rating: 5,
    source: "Google",
  },
  {
    name: "Robert",
    text: "Betty and her team are great! They do an excellent job in general and are conscious of pets too while they work. I've had them regularly come over for about a year now and will continue to use them for the foreseeable future.",
    rating: 5,
    source: "Google",
  },
  {
    name: "Sarah M.",
    text: "Maid For Chico did an incredible job on my home. Every surface was spotless and the attention to detail was amazing. Highly recommend!",
    rating: 5,
    source: "Google",
  },
];

const ReviewsSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
          <div>
            <h2 className="font-display text-[clamp(2.5rem,5vw,5rem)] leading-[0.95] text-accent mb-4">
              {t("reviews.title")}
            </h2>
            <p className="font-body font-light text-muted-foreground text-lg max-w-xl">
              {t("reviews.subtitle")}
            </p>
          </div>

          {/* Rating badge */}
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 border border-border px-5 py-3 hover:border-accent/40 transition-colors group shrink-0"
          >
            <span className="font-display text-4xl text-accent leading-none">4.7</span>
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-body">37 Google reviews</span>
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-accent transition-colors ml-1" />
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-14">
          {testimonials.map((review) => (
            <div
              key={review.name}
              className="border border-border p-8 hover:border-accent/40 transition-colors"
            >
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="font-body font-light text-foreground/80 text-sm leading-relaxed mb-6 italic">
                "{review.text}"
              </p>
              <div className="flex items-center justify-between">
                <span className="font-body font-normal text-foreground text-sm">{review.name}</span>
                <span className="text-xs text-muted-foreground">via {review.source}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 text-xs uppercase tracking-[0.15em] font-body rounded-md hover:bg-accent/90 transition-colors"
          >
            <Star className="w-3.5 h-3.5" />
            {t("reviews.google")}
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.yelp.com/biz/maid-for-chico-chico"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 text-xs uppercase tracking-[0.15em] font-body rounded-md hover:bg-accent/90 transition-colors"
          >
            <Star className="w-3.5 h-3.5" />
            {t("reviews.yelp")}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
