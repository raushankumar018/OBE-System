import Header from "../components/LandingComponent/Header";
import HeroSection from "../components/LandingComponent/HeroSection";
import ProblemSection from "../components/LandingComponent/ProblemSection";
import HowItWorks from "../components/LandingComponent/HowItWorks";
import Features from "../components/LandingComponent/Features";
import ContactUs from "../components/LandingComponent/ContactUs";
import Footer from "../components/LandingComponent/Footer";

export default function LandingPage() {
  return (
    <>
      <Header />
      <HeroSection />
      <ProblemSection />
      <HowItWorks />
      <Features />
      <ContactUs />
      <Footer />
    </>
  );
}