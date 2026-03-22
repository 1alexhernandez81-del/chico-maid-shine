import { Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PHONE_NUMBER = "5309660752";
const WHATSAPP_NUMBER = "15309660752";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I'm interested in your cleaning services.")}`;

const logContact = (channel: string) => {
  supabase
    .from("contact_logs")
    .insert({ channel, source_page: window.location.pathname, user_agent: navigator.userAgent })
    .then(({ error }) => {
      if (error) console.error("Failed to log contact:", error);
    });
};

const FloatingButtons = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* WhatsApp */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => logContact("whatsapp")}
        className="group flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-110 transition-transform"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

      {/* Click to Call */}
      <a
        href={`tel:${PHONE_NUMBER}`}
        onClick={() => logContact("phone")}
        className="group flex items-center justify-center w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:scale-110 transition-transform"
        aria-label="Call us"
      >
        <Phone className="w-6 h-6" />
      </a>
    </div>
  );
};

export default FloatingButtons;
