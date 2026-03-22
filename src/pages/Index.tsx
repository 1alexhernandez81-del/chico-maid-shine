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