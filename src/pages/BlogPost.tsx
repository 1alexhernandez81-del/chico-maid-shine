import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";

interface BlogPostData {
  title: Record<string, string>;
  meta: Record<string, string>;
  content: Record<string, string>;
  date: string;
  readTime: string;
}

const posts: Record<string, BlogPostData> = {
  "spring-cleaning-checklist-chico": {
    title: { en: "Spring Cleaning Checklist for Chico Homes", es: "Lista de Limpieza de Primavera para Hogares de Chico" },
    meta: { en: "A complete spring cleaning checklist for Chico, CA homeowners.", es: "Una lista completa de limpieza de primavera para propietarios en Chico, CA." },
    date: "2026-03-15",
    readTime: "6 min",
    content: {
      en: `<h2>Why Spring Cleaning Matters in Chico</h2>
<p>After Chico's mild but dusty winter, spring is the perfect time to give your home a thorough refresh. Pollen, Valley dust, and indoor allergens build up over the cooler months — a deep clean helps your family breathe easier and enjoy the beautiful spring weather.</p>

<h2>Kitchen</h2>
<ul>
<li>Degrease stovetop, oven, and range hood</li>
<li>Wipe down all cabinet fronts and handles</li>
<li>Clean out and organize the refrigerator</li>
<li>Sanitize countertops and backsplash</li>
<li>Deep clean the dishwasher and microwave</li>
</ul>

<h2>Bathrooms</h2>
<ul>
<li>Scrub tile grout and recaulk if needed</li>
<li>Descale faucets and showerheads</li>
<li>Wash shower curtains and bath mats</li>
<li>Clean mirrors and glass surfaces</li>
<li>Organize under-sink cabinets</li>
</ul>

<h2>Living Areas</h2>
<ul>
<li>Deep vacuum carpets and rugs (especially important for Chico's allergy season)</li>
<li>Dust ceiling fans, baseboards, and light fixtures</li>
<li>Wash windows inside and out</li>
<li>Flip and vacuum mattresses</li>
<li>Clean and condition any leather furniture</li>
</ul>

<h2>Don't Want to Do It Yourself?</h2>
<p>We get it — spring cleaning is a big job. Maid For Chico offers one-time deep cleaning services that cover every item on this list (and more). Our team is licensed, insured, and bonded, and we use pet-safe, eco-friendly products. <a href="/schedule">Book your spring cleaning today</a> and enjoy the season stress-free.</p>`,
      es: `<h2>Por Qué la Limpieza de Primavera Importa en Chico</h2>
<p>Después del invierno suave pero polvoriento de Chico, la primavera es el momento perfecto para darle a su hogar una renovación completa.</p>

<h2>Cocina</h2>
<ul>
<li>Desengrase la estufa, horno y campana</li>
<li>Limpie todos los frentes de gabinetes y manijas</li>
<li>Limpie y organice el refrigerador</li>
<li>Desinfecte encimeras y salpicadero</li>
</ul>

<h2>Baños</h2>
<ul>
<li>Frote las juntas de azulejos</li>
<li>Descalcifique grifos y cabezales de ducha</li>
<li>Lave cortinas de ducha y tapetes</li>
</ul>

<h2>¿No Quiere Hacerlo Usted Mismo?</h2>
<p>Maid For Chico ofrece servicios de limpieza profunda que cubren cada punto de esta lista. <a href="/schedule">Reserve su limpieza de primavera hoy</a>.</p>`,
    },
  },
  "how-often-deep-clean-home": {
    title: { en: "How Often Should You Deep Clean Your Home?", es: "¿Con Qué Frecuencia Debería Limpiar a Fondo Su Hogar?" },
    meta: { en: "Expert advice on cleaning frequency for every room.", es: "Consejos expertos sobre frecuencia de limpieza." },
    date: "2026-03-10",
    readTime: "5 min",
    content: {
      en: `<h2>The Short Answer</h2>
<p>Most homes benefit from a professional deep clean every 2–4 weeks. But the ideal frequency depends on your household size, pets, and lifestyle.</p>

<h2>Weekly Cleaning</h2>
<p>Best for: Large families, homes with multiple pets, allergy sufferers, or anyone who wants a consistently spotless home. Weekly cleaning keeps dust, pet hair, and germs from building up.</p>

<h2>Bi-Weekly Cleaning</h2>
<p>Best for: Couples, small families, or anyone who maintains light cleaning between visits. This is our most popular option — it strikes the perfect balance between freshness and budget.</p>

<h2>Monthly Cleaning</h2>
<p>Best for: Singles, small apartments, or homes without pets. Monthly gives your space a thorough reset even if daily messes are minimal.</p>

<h2>Our Recommendation</h2>
<p>Start with bi-weekly and adjust from there. Many of our Chico clients start bi-weekly and find it's the perfect rhythm. We offer flat-rate pricing for all frequencies — <a href="/schedule">get a free quote today</a>.</p>`,
      es: `<h2>La Respuesta Corta</h2>
<p>La mayoría de los hogares se benefician de una limpieza profunda cada 2–4 semanas. La frecuencia ideal depende del tamaño de su hogar, mascotas y estilo de vida.</p>

<h2>Nuestra Recomendación</h2>
<p>Comience con quincenal y ajuste desde ahí. Ofrecemos precios fijos para todas las frecuencias — <a href="/schedule">obtenga una cotización gratis hoy</a>.</p>`,
    },
  },
  "hiring-cleaning-service-chico-what-to-know": {
    title: { en: "Hiring a Cleaning Service in Chico: What to Know", es: "Contratar un Servicio de Limpieza en Chico: Lo Que Debe Saber" },
    meta: { en: "Guide to choosing the best cleaning service in Chico, CA.", es: "Guía para elegir el mejor servicio de limpieza en Chico, CA." },
    date: "2026-03-05",
    readTime: "7 min",
    content: {
      en: `<h2>What to Look For</h2>
<p>Not all cleaning services are created equal. Here are the key things to check before hiring anyone in Chico:</p>

<h3>1. Licensed, Insured, and Bonded</h3>
<p>This protects you if something goes wrong. Always ask for proof. Maid For Chico is fully licensed, insured, and bonded in Butte County.</p>

<h3>2. Real Reviews from Real Customers</h3>
<p>Check Google and Yelp reviews. Look for consistent quality over time, not just one or two good reviews. We're proud of our 4.7-star rating with 37+ Google reviews.</p>

<h3>3. Transparent Pricing</h3>
<p>Avoid companies that won't give you a clear quote upfront. We offer flat-rate pricing so you know exactly what you'll pay.</p>

<h3>4. Pet-Friendly Products</h3>
<p>If you have pets, make sure your cleaner uses safe, non-toxic products. Our team uses eco-friendly products that are safe for kids and pets.</p>

<h3>5. Satisfaction Guarantee</h3>
<p>A good cleaning company stands behind their work. If you're not happy, they should make it right.</p>

<h2>Ready to Try the Best?</h2>
<p>Maid For Chico checks every box. <a href="/schedule">Schedule your first cleaning</a> and see why our customers keep coming back.</p>`,
      es: `<h2>Qué Buscar</h2>
<p>No todos los servicios de limpieza son iguales. Estas son las cosas clave a verificar antes de contratar a alguien en Chico.</p>

<h2>¿Listo para Probar lo Mejor?</h2>
<p>Maid For Chico cumple con todos los requisitos. <a href="/schedule">Programe su primera limpieza</a>.</p>`,
    },
  },
  "pet-friendly-cleaning-tips": {
    title: { en: "Pet-Friendly Cleaning: Keeping Your Home Safe & Spotless", es: "Limpieza Amigable con Mascotas" },
    meta: { en: "Safe cleaning tips for homes with pets in Chico, CA.", es: "Consejos de limpieza segura para hogares con mascotas." },
    date: "2026-02-28",
    readTime: "5 min",
    content: {
      en: `<h2>Why Pet-Safe Cleaning Matters</h2>
<p>Chico is a pet-loving community — and your cleaning products should reflect that. Many common household cleaners contain chemicals that can irritate your pet's skin, eyes, and respiratory system.</p>

<h2>Products to Avoid</h2>
<ul>
<li>Bleach and ammonia-based cleaners</li>
<li>Phenol-containing disinfectants</li>
<li>Essential oil diffusers (some oils are toxic to cats and dogs)</li>
<li>Toilet bowl cleaners with strong acids</li>
</ul>

<h2>Safe Alternatives</h2>
<ul>
<li>Vinegar and water solutions for surfaces</li>
<li>Baking soda for odor removal</li>
<li>Plant-based, fragrance-free cleaning products</li>
<li>Enzyme cleaners for pet stain removal</li>
</ul>

<h2>How Maid For Chico Handles Pets</h2>
<p>Our team is trained to work around pets safely. We use eco-friendly, non-toxic products on every job. As Robert noted in his review: "They are conscious of pets too while they work." <a href="/schedule">Book a pet-friendly cleaning today</a>.</p>`,
      es: `<h2>Por Qué Importa la Limpieza Segura para Mascotas</h2>
<p>Chico es una comunidad amante de las mascotas — y sus productos de limpieza deberían reflejar eso.</p>

<h2>Cómo Maid For Chico Maneja las Mascotas</h2>
<p>Nuestro equipo está entrenado para trabajar alrededor de mascotas de forma segura. <a href="/schedule">Reserve una limpieza amigable con mascotas hoy</a>.</p>`,
    },
  },
  "move-out-cleaning-guide": {
    title: { en: "Move-Out Cleaning Guide: Get Your Full Deposit Back", es: "Guía de Limpieza de Mudanza" },
    meta: { en: "Move-out cleaning tips to get your rental deposit back in Chico, CA.", es: "Consejos de limpieza de mudanza para recuperar su depósito." },
    date: "2026-02-20",
    readTime: "8 min",
    content: {
      en: `<h2>Why Move-Out Cleaning Matters</h2>
<p>In Chico's competitive rental market, landlords inspect thoroughly before returning deposits. A professional move-out cleaning can mean the difference between losing hundreds of dollars or getting your full deposit back.</p>

<h2>What Landlords Check</h2>
<ul>
<li>Oven and stovetop (the #1 thing landlords flag)</li>
<li>Bathroom grout and fixtures</li>
<li>Inside all cabinets and closets</li>
<li>Window tracks and blinds</li>
<li>Baseboards and light switch plates</li>
<li>Carpet stains and pet damage</li>
</ul>

<h2>Pro Tips</h2>
<ul>
<li>Take photos before and after cleaning for documentation</li>
<li>Don't forget the garage and outdoor areas if included in your lease</li>
<li>Clean or replace HVAC filters</li>
<li>Patch small nail holes with spackle</li>
</ul>

<h2>Let Professionals Handle It</h2>
<p>Our move-out cleaning service covers every landlord inspection point. We've helped dozens of Chico renters get their full deposits back. <a href="/schedule">Book your move-out cleaning</a> — it pays for itself.</p>`,
      es: `<h2>Por Qué la Limpieza de Mudanza Importa</h2>
<p>En el mercado de alquiler competitivo de Chico, los propietarios inspeccionan minuciosamente antes de devolver depósitos.</p>

<h2>Deje que los Profesionales se Encarguen</h2>
<p>Nuestro servicio de limpieza de mudanza cubre cada punto de inspección. <a href="/schedule">Reserve su limpieza de mudanza</a>.</p>`,
    },
  },
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t } = useLanguage();
  const post = slug ? posts[slug] : undefined;

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={`${post.title[lang]} — Maid For Chico`}
        description={post.meta[lang]}
        canonical={`https://maidforchico.com/blog/${slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title[lang],
          "description": post.meta[lang],
          "datePublished": post.date,
          "author": { "@type": "Organization", "name": "Maid For Chico" },
          "publisher": { "@type": "Organization", "name": "Maid For Chico", "url": "https://maidforchico.com" },
          "mainEntityOfPage": `https://maidforchico.com/blog/${slug}`,
        }}
      />
      <Navbar />
      <main className="flex-1">
        <article className="py-20 md:py-28">
          <div className="container mx-auto px-6 md:px-12 max-w-3xl">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors font-body mb-8">
              <ArrowLeft className="w-4 h-4" />
              {t("blog.back")}
            </Link>

            <div className="flex items-center gap-4 text-xs text-muted-foreground font-body mb-6">
              <span>{new Date(post.date).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span>·</span>
              <span>{post.readTime} {t("blog.read")}</span>
            </div>

            <h1 className="font-display font-black text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] mb-12 text-foreground" style={{ overflowWrap: "break-word" }}>
              {post.title[lang]}
            </h1>

            <div
              className="prose prose-invert prose-sm max-w-none font-body font-light
                prose-headings:font-display prose-headings:text-accent prose-headings:mt-10 prose-headings:mb-4
                prose-p:text-foreground/70 prose-p:leading-relaxed prose-p:mb-4
                prose-li:text-foreground/70 prose-li:leading-relaxed
                prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                prose-ul:my-4 prose-ul:pl-5
                prose-h2:text-2xl prose-h3:text-xl"
              dangerouslySetInnerHTML={{ __html: post.content[lang] }}
            />

            {/* CTA */}
            <div className="mt-16 pt-10 border-t border-border text-center">
              <h3 className="font-display text-2xl text-accent mb-3">{t("blog.cta.title")}</h3>
              <p className="font-body font-light text-foreground/60 mb-6">{t("blog.cta.desc")}</p>
              <a
                href="/schedule"
                className="inline-block bg-accent text-accent-foreground px-6 py-3 font-body text-xs uppercase tracking-[0.15em] rounded-md hover:bg-accent/90 transition-colors"
              >
                {t("hero.cta")}
              </a>
            </div>
          </div>
        </article>
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
};

export default BlogPost;
