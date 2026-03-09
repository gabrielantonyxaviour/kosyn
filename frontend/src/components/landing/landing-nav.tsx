"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] transition-all duration-700"
      style={{
        background: scrolled ? "rgba(0,0,0,0.9)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/kosyn-logo.png"
            alt="Kosyn"
            width={22}
            height={22}
            className="opacity-90"
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              color: "#fff",
              letterSpacing: "0.08em",
            }}
          >
            KOSYN AI
          </span>
        </div>

        <div className="hidden md:flex items-center gap-10">
          {["Features", "Protocol", "Technology"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              style={{
                fontFamily: "var(--font-mono-custom)",
                fontSize: "11px",
                color: "#666",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
              className="hover:text-white transition-colors duration-300"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/pitch"
            className="px-4 py-2 transition-all duration-300 hover:text-white"
            style={{
              fontFamily: "var(--font-mono-custom)",
              fontSize: "11px",
              color: "#666",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Pitch Deck
          </Link>
          <Link
            href="/demo-video"
            className="px-5 py-2.5 transition-all duration-300 hover:bg-white hover:text-black"
            style={{
              fontFamily: "var(--font-mono-custom)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#aaa",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "6px",
            }}
          >
            Demo
          </Link>
        </div>
      </div>
    </nav>
  );
}
