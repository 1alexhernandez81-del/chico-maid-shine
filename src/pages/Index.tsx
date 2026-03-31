import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import HeroSection, { LineDivider } from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import ReviewsSection from "@/components/ReviewsSection";
import GallerySection from "@/components/GallerySection";
import WhyChooseUs from "@/components/WhyChooseUs";
import TrustAndAreas from "@/components/TrustAndAreas";
import FloatingButtons from "@/components/FloatingButtons";
import StickyBookNow from "@/components/StickyBookNow";
import PromoSection from "@/components/PromoSection";
import Footer from "@/components/Footer";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const bookingId = searchParams.get("booking_id");
    const method = searchParams.get("method");
    const amount = searchParams.get("amount");
    const fee = searchParams.get("fee");

    if (paymentStatus === "success" && bookingId) {
      // Call update-payment-status to record the payment
      supabase.functions.invoke("update-payment-status", {
        body: {
          bookingId,
          paymentMethod: method || "credit_card",
          amount: amount || "0",
          fee: fee || "0",
        },
      }).then(() => {
        // Clean up URL params
        setSearchParams({}, { replace: true });
      }).catch((err) => {
        console.error("Failed to update payment status:", err);
        setSearchParams({}, { replace: true });
      });
    } else if (paymentStatus === "cancelled") {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <LineDivider />
        <ServicesSection />
        <PromoSection />
        <ReviewsSection />
        <GallerySection />
        <TrustAndAreas />
        <WhyChooseUs />
      </main>
      <Footer />
      <FloatingButtons />
      <StickyBookNow />
    </div>
  );
};

export default Index;