import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

const blogPosts = [
  {
    slug: "spring-cleaning-checklist-chico",
    title: { en: "Spring Cleaning Checklist for Chico Homes", es: "Lista de Limpieza de Primavera para Hogares de Chico" },
    excerpt: {
      en: "The ultimate room-by-room spring cleaning guide for homeowners in Chico, CA. Get your home fresh and ready for the warmer months.",
      es: "La guía definitiva de limpieza de primavera habitación por habitación para propietarios en Chico, CA.",
    },
    date: "2026-03-15",
    readTime: "6 min",
  },
  {
    slug: "how-often-deep-clean-home",
    title: { en: "How Often Should You Deep Clean Your Home?", es: "¿Con Qué Frecuencia Debería Limpiar a Fondo Su Hogar?" },
    excerpt: {
      en: "Find out the ideal cleaning frequency for different areas of your home. Weekly, biweekly, or monthly — here's what the experts recommend.",
      es: "Descubra la frecuencia ideal de limpieza para diferentes áreas de su hogar.",
    },
    date: "2026-03-10",
    readTime: "5 min",
  },
  {
    slug: "hiring-cleaning-service-chico-what-to-know",
    title: { en: "Hiring a Cleaning Service in Chico: What to Know", es: "Contratar un Servicio de Limpieza en Chico: Lo Que Debe Saber" },
    excerpt: {
      en: "Questions to ask, red flags to watch for, and what makes a great cleaning company. Your complete guide to choosing a cleaner in Chico, CA.",
      es: "Preguntas que hacer, señales de alerta y qué hace a una gran empresa de limpieza.",
    },
    date: "2026-03-05",
    readTime: "7 min",
  },
  {
    slug: "pet-friendly-cleaning-tips",
    title: { en: "Pet-Friendly Cleaning: Keeping Your Home Safe & Spotless", es: "Limpieza Amigable con Mascotas: Mantenga Su Hogar Seguro e Impecable" },
    excerpt: {
      en: "How to keep your home clean without harsh chemicals that can harm your furry friends. Tips from professional pet-conscious cleaners.",
      es: "Cómo mantener su hogar limpio sin químicos agresivos que puedan dañar a sus mascotas.",
    },
    date: "2026-02-28",
    readTime: "5 min",
  },
  {
    slug: "move-out-cleaning-guide",
    title: { en: "Move-Out Cleaning Guide: Get Your Full Deposit Back", es: "Guía de Limpieza de Mudanza: Recupere Su Depósito Completo" },
    excerpt: {
      en: "Moving out of a rental in Chico? Here's exactly what landlords look for during inspections and how to clean for a full deposit refund.",
      es: "¿Se muda de un alquiler en Chico? Esto es exactamente lo que buscan los propietarios durante las inspecciones.",
    },
    date: "2026-02-20",
    readTime: "8 min",
  },
];

const Blog = () => {
  const { lang, t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={lang === "es" ? "Blog — Maid For Chico" : "Cleaning Tips & Blog — Maid For Chico"}
        description={lang === "es" ? "Consejos de limpieza profesional para hogares en Chico, CA." : "Professional cleaning tips, guides, and advice for homeowners in Chico, CA. From Maid For Chico."}
        canonical="https://maidforchico.com/blog"
      />
      <Navbar />
      <main className="flex-1">
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-6 md:px-12 max-w-4xl">
            <h1 className="font-display font-black text-[clamp(2.5rem,6vw,5rem)] leading-[0.92] mb-4 text-foreground">
              <span className="text-accent">{t("blog.title")}</span>
            </h1>
            <p className="font-body font-light text-foreground/60 text-lg mb-16 max-w-2xl">
              {t("blog.subtitle")}
            </p>

            <div className="space-y-0">
              {blogPosts.map((post, i) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="block group border-t border-border py-8 last:border-b hover:bg-secondary/30 -mx-4 px-4 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-8">
                    <div className="flex-1">
                      <h2 className="font-display text-xl md:text-2xl text-foreground group-hover:text-accent transition-colors mb-2" style={{ lineHeight: "1.2" }}>
                        {post.title[lang]}
                      </h2>
                      <p className="font-body font-light text-foreground/50 text-sm leading-relaxed">
                        {post.excerpt[lang]}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-body shrink-0 mt-2 md:mt-1">
                      <span>{new Date(post.date).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span>·</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-border">
          <div className="container mx-auto px-6 md:px-12 max-w-4xl text-center">
            <h2 className="font-display text-2xl md:text-3xl mb-4 text-accent">{t("blog.cta.title")}</h2>
            <p className="font-body font-light text-foreground/60 mb-8">
              {t("blog.cta.desc")}
            </p>
            <a
              href="/schedule"
              className="inline-block bg-accent text-accent-foreground px-6 py-3 font-body text-xs uppercase tracking-[0.15em] rounded-md hover:bg-accent/90 transition-colors"
            >
              {t("hero.cta")}
            </a>
          </div>
        </section>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
};

export default Blog;
