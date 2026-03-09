import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Technical Architecture | Kosyn AI",
  description:
    "Six technical breakthroughs behind Kosyn AI — ConfidentialHTTP, Nillion attestation, ACE policies, HIPAA bitmask, consensus IPFS, ECDH key wrapping.",
};

export default function ArchitectureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
