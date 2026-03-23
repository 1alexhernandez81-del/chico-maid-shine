import { Home, CalendarCheck, DollarSign, Sparkles, Clock, RotateCcw, Heart, MessageSquare } from "lucide-react";
import { formatTime12, formatLabel } from "./utils";
import type { Booking } from "./types";

export type EmailTemplate = {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  subject: (b: Booking) => string;
  body: (b: Booking) => string;
};

export const getEmailTemplates = (booking: Booking | null, t: (key: string) => string): EmailTemplate[] => {
  if (!booking) return [];

  const name = (booking.name ?? "").trim().split(/\s+/)[0] || "there";
  const serviceLabel = formatLabel(booking.service_type);
  const frequencyLabel = formatLabel(booking.frequency);

  return [
    {
      id: "estimate-request",
      name: t("admin.template.estimate_request"),
      icon: <Home className="w-3.5 h-3.5" />,
      color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      subject: () => "In-Home Estimate \u2014 Let's Schedule a Visit!",
      body: (b) =>
        `We are excited to help clean your home. We would like to do a quick in-home estimate before we finalize and book your cleaning date.\n\nDo you have 15 to 30 minutes this week for our team to come by for the in-home estimate?\n\nHere's what we have on file:\n\u{1F4CD} Address: ${b.street}, ${b.city}, CA ${b.zip}\n\u{1F3E0} Service: ${serviceLabel}\n\nPlease reply with a few times that work best for you and we'll get it scheduled!\n\nThank you!\nBetty & the Maid for Chico Team`,
    },
    {
      id: "estimate-confirm",
      name: t("admin.template.estimate_confirm"),
      icon: <CalendarCheck className="w-3.5 h-3.5" />,
      color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
      subject: (b) => `Your In-Home Estimate is Confirmed \u2014 ${b.estimate_date || "TBD"}`,
      body: (b) =>
        `Great news \u2014 your in-home estimate visit is confirmed!\n\n\u{1F4C5} Date: ${b.estimate_date || "TBD"}\n\u{1F550} Time: ${formatTime12(b.estimate_time)}\n\u{1F4CD} Address: ${b.street}, ${b.city}, CA ${b.zip}\n\nOur team will stop by to take a quick look at your home and provide you with a personalized quote. This is NOT a cleaning appointment \u2014 just a quick visit so we can give you an accurate price.\n\n\u{1F4A1} Good to know: If you decide to move forward after the estimate, a 25% deposit is required to secure your cleaning date. Please send the deposit via Zelle to (530) 966-0752. Once received, we'll finalize your booking. The remaining balance is due on the day of your cleaning.\n\nIf you need to reschedule, just reply to this email or give us a call at (530) 966-0752.\n\nSee you soon!\nBetty & the Maid for Chico Team`,
    },
    {
      id: "send-quote",
      name: t("admin.template.send_quote"),
      icon: <DollarSign className="w-3.5 h-3.5" />,
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      subject: () => "Your Cleaning Estimate from Maid for Chico",
      body: (b) => {
        const amt = (b as any)._quoteAmount || (b.total_price ? String(b.total_price) : "");
        const quoteDisplay = amt ? `$${amt}` : "$_____";
        return `Thank you for letting us visit your home! Based on our walk-through, here is your personalized cleaning estimate:\n\n\u{1F3E0} Service: ${serviceLabel}\n\u{1F4CD} Address: ${b.street}, ${b.city}, CA ${b.zip}\n\u{1F4D0} Size: ${b.sqft ? b.sqft + " sqft" : "N/A"} | ${b.bedrooms || "\u2014"} bed / ${b.bathrooms || "\u2014"} bath\n\u{1F4CB} Frequency: ${frequencyLabel}\n\n\u{1F4B0} Estimated Quote: ${quoteDisplay} per visit\n\n\u26A0\uFE0F Please note: This is an estimate and is subject to change depending on additional services requested or removed at the time of cleaning.\n\n\u{1F4B3} DEPOSIT: A 25% deposit is required to secure your cleaning date. We'll collect the deposit once you approve. The remaining balance is due on the day of your cleaning.\n\nOr call us at (530) 966-0752.\n\nWe'd love to make your home sparkle!\nBetty & the Maid for Chico Team`;
      },
    },
    {
      id: "cleaning-scheduled",
      name: t("admin.template.cleaning_scheduled"),
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: "text-green-400 border-green-500/30 bg-green-500/10",
      subject: (b) => `Your Cleaning is Booked! \u2014 ${b.preferred_date}`,
      body: (b) =>
        `Exciting news \u2014 your cleaning has been scheduled! \u{1F389}\n\n\u{1F4C5} Date: ${b.preferred_date}\n\u{1F550} Time: ${b.preferred_time || "TBD"}\n\u{1F4CD} Address: ${b.street}, ${b.city}, CA ${b.zip}\n\u{1F3E0} Service: ${serviceLabel}\n\nHere are a few things to keep in mind:\n\u2022 Please make sure we have access to your home at the scheduled time\n\u2022 Secure any pets if applicable\n\u2022 Let us know if there are any special instructions\n\nIf you need to reschedule, please let us know at least 24 hours in advance.\n\nWe look forward to making your home sparkle!\nBetty & the Maid for Chico Team`,
    },
    {
      id: "estimate-reschedule",
      name: t("admin.template.estimate_reschedule"),
      icon: <Clock className="w-3.5 h-3.5" />,
      color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
      subject: () => "Quick Note About Your Estimate Time \u2014 Maid for Chico",
      body: (b) =>
        `Thank you for reaching out and requesting an in-home estimate! We really appreciate your interest.\n\nUnfortunately, the time you selected isn't available for our team:\n\n\u{1F4C5} Requested Date: ${b.estimate_date || b.preferred_date}\n\u{1F550} Requested Time: ${formatTime12(b.estimate_time) || "N/A"}\n\u{1F4CD} Address: ${b.street}, ${b.city}, CA ${b.zip}\n\nWe'd love to still come by \u2014 we just need to find a time that works! Our team is available Monday\u2013Friday, 9:30 AM \u2013 5:00 PM (mornings tend to work best \u2B50).\n\nCould you reply with 2\u20133 alternate dates/times that work for you? We'll do our best to match your schedule!\n\nThank you for being flexible \u2014 we can't wait to help!\nBetty & the Maid for Chico Team`,
    },
    {
      id: "reschedule-notice",
      name: t("admin.template.reschedule_notice"),
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      subject: () => "Reschedule Request \u2014 Maid for Chico",
      body: (b) =>
        `We wanted to reach out regarding your upcoming appointment. Unfortunately, we need to reschedule your service.\n\n\u{1F4CD} Address: ${b.street}, ${b.city}, CA ${b.zip}\n\u{1F4C5} Original Date: ${b.preferred_date}\n\nWe sincerely apologize for any inconvenience. Please reply with a few dates and times that work for you and we'll get you rebooked right away.\n\nThank you for your understanding!\nBetty & the Maid for Chico Team`,
    },
    {
      id: "thank-you",
      name: t("admin.template.thank_you"),
      icon: <Heart className="w-3.5 h-3.5" />,
      color: "text-pink-400 border-pink-500/30 bg-pink-500/10",
      subject: () => "Thank You from Maid for Chico! \u{1F49B}",
      body: () =>
        `Thank you so much for choosing Maid for Chico! We hope your home is looking and feeling fresh. \u2728\n\nIf you have a moment, we'd truly appreciate a quick review \u2014 it helps us grow and serve more families like yours:\n\n\u2B50 Google: https://www.google.com/maps/place/Maid+For+Chico/@39.7238225,-122.007554,9z/data=!4m8!3m7!1s0x8082d9f21b5035d3:0x189f9dfb3b334fcb!8m2!3d39.7238225!4d-122.007554!9m1!1b1!16s%2Fg%2F11ghnxkzp4?entry=ttu\n\u2B50 Yelp: https://www.yelp.com/biz/maid-for-chico-chico\n\nAlso, did you know about our referral program? Refer a friend and you BOTH get $25 off your next cleaning! Share this link: https://maidforchico.com/refer\n\nWe'd love to see you again!\nBetty & the Maid for Chico Team`,
    },
    {
      id: "general-followup",
      name: t("admin.template.general_followup"),
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      color: "text-slate-400 border-slate-500/30 bg-slate-500/10",
      subject: () => "Following Up \u2014 Maid for Chico",
      body: () =>
        `We wanted to follow up on your recent inquiry. We'd love to help get your home cleaned!\n\nIs there anything we can answer or help with to move forward? We're happy to work around your schedule.\n\nFeel free to reply to this email or call us at (530) 966-0752.\n\nLooking forward to hearing from you!\nBetty & the Maid for Chico Team`,
    },
  ];
};
