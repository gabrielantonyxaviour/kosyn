import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pitch Deck | Kosyn AI",
  description:
    "Kosyn AI — HIPAA-compliant confidential health intelligence on Chainlink CRE.",
};

export default function PitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
