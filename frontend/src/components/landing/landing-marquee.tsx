const tech = [
  "Chainlink CRE",
  "Confidential HTTP",
  "Vault DON",
  "ACE PolicyEngine",
  "Nillion nilAI",
  "TEE Enclaves",
  "Avalanche Fuji",
  "IPFS Pinata",
  "Thirdweb Connect",
  "CCIP",
  "Base Sepolia",
  "EVM Read/Write",
  "Log Trigger",
  "HTTP Trigger",
  "Kite AI",
];

export default function LandingMarquee() {
  const items = [...tech, ...tech];

  return (
    <section
      id="technology"
      className="py-10 overflow-hidden"
      style={{
        background: "#000",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="relative">
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10"
          style={{ background: "linear-gradient(to right, #000, transparent)" }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10"
          style={{ background: "linear-gradient(to left, #000, transparent)" }}
        />

        <div className="marquee-track flex items-center gap-12 select-none">
          {items.map((name, i) => (
            <div key={i} className="flex items-center gap-4 flex-shrink-0">
              <div
                className="h-px w-4"
                style={{
                  background:
                    i % 4 === 0 ? "#ffffff" : "rgba(255,255,255,0.15)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono-custom)",
                  fontSize: "12px",
                  color: i % 4 === 0 ? "#888" : "#333",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .marquee-track {
          animation: marquee 35s linear infinite;
          width: max-content;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
