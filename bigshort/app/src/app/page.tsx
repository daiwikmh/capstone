import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TwoLegs } from "@/components/landing/TwoLegs";
import { Safety } from "@/components/landing/Safety";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <Hero />
      <HowItWorks />
      <TwoLegs />
      <Safety />
      <Footer />
    </div>
  );
}
