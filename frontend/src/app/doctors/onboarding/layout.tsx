import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Provider Onboarding | Kosyn AI",
  description:
    "Register as a verified healthcare provider on the Kosyn network.",
};

export default function DoctorOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
