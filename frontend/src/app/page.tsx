import SmoothScroll from "@/components/landing/smooth-scroll";
import LandingNav from "@/components/landing/landing-nav";
import LandingHero from "@/components/landing/landing-hero";
import LandingFeatures from "@/components/landing/landing-features";
import LandingFlow from "@/components/landing/landing-flow";
import LandingMarquee from "@/components/landing/landing-marquee";
import LandingCinematic from "@/components/landing/landing-cinematic";
import LandingCTA from "@/components/landing/landing-cta";

export default function LandingPage() {
  return (
    <SmoothScroll>
      <div style={{ background: "#030712", minHeight: "100vh" }}>
        <LandingNav />
        <LandingHero />
        <LandingFeatures />
        <LandingFlow />
        <LandingMarquee />
        <LandingCinematic />
        <LandingCTA />
      </div>
    </SmoothScroll>
  );
}
