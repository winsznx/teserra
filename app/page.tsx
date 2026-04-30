import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { HumansAndAgents } from "@/components/humans-and-agents";
import { EcosystemSection } from "@/components/ecosystem-section";
import { CTASection } from "@/components/cta-section";

export default function LandingPage() {
  const ecosystemItems = ["LENDING", "RENTALS", "DAOS", "VISA", "AGENTS", "PAYROLL", "CREDIT", "IDENTITY"];
  
  return (
    <div className="flex flex-col items-center gap-16 lg:gap-24 pb-24 relative overflow-hidden">
      <HeroSection />
      <HowItWorks />
      <HumansAndAgents />
      <EcosystemSection items={ecosystemItems} />
      <CTASection />
    </div>
  );
}
