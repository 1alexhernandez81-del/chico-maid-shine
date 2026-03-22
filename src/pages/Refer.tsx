import { useState } from "react";
import { Gift, Share2, CheckCircle, Copy, MessageSquare, Phone, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const REFERRAL_URL = "https://maidforchico.com/refer";
const PHONE = "5309660752";

const Refer = () => {
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  const referralMessage =
    lang === "es"
      ? `¡Hola! Usa este enlace para obtener 15% de descuento en tu primera limpieza con Maid For Chico: ${REFERRAL_URL}`
      : `Hey! Use this link to get 15% off your first cleaning with Maid For Chico: ${REFERRAL_URL}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralMessage);
      setCopied(true);
      toast.success(lang === "es" ? "¡Enlace copiado!" : "Link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(lang === "es" ? "No se pudo copiar" : "Could not copy");
    }
  };

  const handleTextShare = () => {
    const smsBody = encodeURIComponent(referralMessage);
    window.open(`sms:?body=${smsBody}`, "_self");
  };

  const handleWhatsApp = () => {
    const waBody = encodeURIComponent(referralMessage);
    window.open(`https://wa.me/?text=${waBody}`, "_blank");
  };

  const steps = [
    {
      en: "Share your unique link with friends or family",
      es: "Comparte tu enlace con amigos o familiares",
    },
    {
      en: "They book a cleaning of $150 or more and get 15% off",
      es: "Ellos reservan una limpieza de $150 o más y obtienen 15% de descuento",
    },
    {
      en: "You receive a $25 credit toward your next cleaning",
      es: "Tú recibes un crédito de $25 para tu próxima limpieza",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="container mx-auto px-6 md:px-12 max-w-2xl">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs font-body uppercase tracking-[0.15em] mb-12 transition-colors duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {lang === "es" ? "Inicio" : "Home"}
          </Link>

          {/* Header */}
          <div className="mb-14">
            <span className="inline-block bg-accent text-accent-foreground text-[10px] uppercase tracking-[0.2em] font-body px-4 py-1.5 rounded-sm mb-6">
              {lang === "es" ? "Programa de Referidos" : "Referral Program"}
            </span>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground mb-4" style={{ lineHeight: "1.1" }}>
              {lang === "es" ? "Recomienda. Ahorra. Repite." : "Refer. Save. Repeat."}
            </h1>
            <p className="font-body font-light text-muted-foreground text-base leading-relaxed max-w-lg">
              {lang === "es"
                ? "Comparte el amor por la limpieza con tus amigos — ambos son recompensados. Sin límite de referidos."
                : "Share the clean with your friends — you both get rewarded. No limit on referrals."}
            </p>
          </div>

          {/* How it works */}
          <div className="mb-14">
            <h2 className="font-display text-xl text-foreground mb-6">
              {lang === "es" ? "Cómo Funciona" : "How It Works"}
            </h2>
            <div className="space-y-5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center font-body text-sm font-medium">
                    {i + 1}
                  </span>
                  <p className="font-body text-sm text-foreground/80 pt-1.5 leading-relaxed">
                    {lang === "es" ? step.es : step.en}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Share card */}
          <div className="bg-card border border-border rounded-md p-6 md:p-8 mb-14">
            <div className="flex items-center gap-2.5 mb-5">
              <Share2 className="w-5 h-5 text-accent" />
              <h3 className="font-display text-lg text-foreground">
                {lang === "es" ? "Comparte Tu Enlace" : "Share Your Link"}
              </h3>
            </div>

            {/* Link preview */}
            <div className="bg-background border border-border rounded-sm px-4 py-3 mb-5 flex items-center justify-between gap-3">
              <span className="font-body text-sm text-muted-foreground truncate select-all">
                {REFERRAL_URL}
              </span>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-2 rounded-sm hover:bg-secondary transition-colors duration-200 active:scale-95"
                aria-label="Copy link"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-accent" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Share buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleTextShare}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-6 py-3 font-body text-xs uppercase tracking-[0.15em] rounded-sm hover:bg-accent/85 transition-all duration-300 active:scale-[0.97]"
              >
                <MessageSquare className="w-4 h-4" />
                {lang === "es" ? "Enviar por Texto" : "Send via Text"}
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-secondary text-foreground px-6 py-3 font-body text-xs uppercase tracking-[0.15em] rounded-sm hover:bg-secondary/80 transition-all duration-300 active:scale-[0.97]"
              >
                <Phone className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          </div>

          {/* Rewards breakdown */}
          <div className="grid sm:grid-cols-2 gap-6 mb-14">
            <div className="bg-card border border-border rounded-md p-6">
              <Gift className="w-6 h-6 text-accent mb-4" />
              <h3 className="font-display text-lg text-foreground mb-2">
                {lang === "es" ? "Para Ti" : "For You"}
              </h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                {lang === "es"
                  ? "$25 de crédito en tu próxima limpieza de $150 o más, por cada amigo que reserve."
                  : "$25 credit toward your next cleaning of $150 or more, for every friend who books."}
              </p>
            </div>
            <div className="bg-card border border-border rounded-md p-6">
              <CheckCircle className="w-6 h-6 text-accent mb-4" />
              <h3 className="font-display text-lg text-foreground mb-2">
                {lang === "es" ? "Para Tu Amigo" : "For Your Friend"}
              </h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                {lang === "es"
                  ? "15% de descuento (hasta $50) en su primera limpieza. ¡Sin compromiso!"
                  : "15% off (up to $50) their first cleaning. No strings attached!"}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="font-body text-sm text-muted-foreground mb-4">
              {lang === "es"
                ? "¿Preguntas sobre el programa de referidos?"
                : "Questions about the referral program?"}
            </p>
            <a
              href={`tel:${PHONE}`}
              className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-body text-sm transition-colors duration-200"
            >
              <Phone className="w-4 h-4" />
              (530) 966-0752
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Refer;
