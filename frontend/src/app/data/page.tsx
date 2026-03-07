"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useReadContract } from "thirdweb/react";
import { getDataMarketplace } from "@/lib/contracts";
import { ENDPOINTS } from "@/lib/endpoint-definitions";
import { ApiEndpointCard } from "@/components/api-endpoint-card";
import {
  Database,
  Lock,
  Cpu,
  TrendingUp,
  Copy,
  Check,
  Download,
} from "lucide-react";

type CodeLang = "curl" | "js" | "python";

function SkillInstallCommand({ baseUrl }: { baseUrl: string }) {
  const [copied, setCopied] = useState(false);
  const cmd = `curl -fsSL ${baseUrl}/install-kosyn-skill.sh | sh`;
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
      <code className="flex-1 text-xs font-mono text-muted-foreground truncate">
        {cmd}
      </code>
      <button
        onClick={() => {
          navigator.clipboard.writeText(cmd);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

export default function DataPage() {
  const [selected, setSelected] = useState(ENDPOINTS[0].id);
  const [codeLang, setCodeLang] = useState<CodeLang>("curl");
  const [copied, setCopied] = useState(false);
  const [baseUrl] = useState<string>(() =>
    typeof window !== "undefined"
      ? window.location.origin
      : "https://kosyn.app",
  );

  const { data: queryCount } = useReadContract({
    contract: getDataMarketplace(),
    method: "queryCount",
    params: [],
  });

  const ep = ENDPOINTS.find((e) => e.id === selected)!;

  const copyUrl = () => {
    navigator.clipboard.writeText(`${baseUrl}/api/data`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">
              Kosyn Data API
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Health Analytics Marketplace
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Anonymized population health data gated by x402 micropayments. Every
            query pays KUSD directly to contributing patients via the CRE
            distribution workflow.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { icon: Lock, label: "x402 Payment Standard" },
              { icon: Cpu, label: "TEE-aggregated (CRE)" },
              {
                icon: TrendingUp,
                label: `${queryCount !== undefined ? queryCount.toString() : "0"} queries served`,
              },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-full px-3 py-1"
              >
                <Icon className="h-3 w-3" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* How it works */}
        <div className="rounded-lg border border-border p-5">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              {
                step: "1",
                label: "Patients opt-in",
                desc: "Share anonymized data via patient dashboard",
              },
              {
                step: "2",
                label: "Researcher pays",
                desc: "x402 KUSD payment to DataMarketplace contract",
              },
              {
                step: "3",
                label: "CRE aggregates",
                desc: "TEE enclave computes stats — raw data never exposed",
              },
              {
                step: "4",
                label: "Patients earn",
                desc: "KUSD distributed proportionally via CRE workflow",
              },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Base URL */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            Base URL
          </span>
          <code className="flex-1 text-sm font-mono">{baseUrl}/api/data</code>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 shrink-0"
            onClick={copyUrl}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Endpoints */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Available Endpoints</h2>
            <Badge variant="outline" className="text-xs">
              Avalanche Fuji · Chain 43113
            </Badge>
          </div>

          <div className="flex border border-border rounded-lg overflow-hidden min-h-[420px]">
            {/* Sidebar */}
            <div className="w-52 shrink-0 border-r border-border bg-muted/20">
              {ENDPOINTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  className={`w-full text-left px-3 py-3 border-b border-border last:border-b-0 transition-colors ${
                    selected === e.id ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-mono py-0 px-1 h-4">
                      GET
                    </Badge>
                    <span className="text-xs font-medium">{e.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    /api/data/{e.id}
                  </p>
                </button>
              ))}
            </div>

            {/* Detail */}
            <div className="flex-1 p-5 space-y-5 overflow-auto">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono">
                      GET
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {ep.category}
                    </Badge>
                  </div>
                  <h3 className="text-base font-semibold">{ep.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {baseUrl}/api/data/{ep.id}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold">
                    {ep.price}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      KUSD
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">per query</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{ep.description}</p>

              {/* Response schema */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Response Fields
                </p>
                <div className="border border-border rounded-md overflow-hidden">
                  {ep.returns.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 px-3 py-2 text-xs ${
                        i < ep.returns.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <code className="font-mono text-primary shrink-0 w-44">
                        {f.field}
                      </code>
                      <code className="font-mono text-muted-foreground shrink-0 w-20">
                        {f.type}
                      </code>
                      <span className="text-muted-foreground">{f.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code examples */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  {(["curl", "js", "python"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLang(lang)}
                      className={`px-2.5 py-1 text-xs rounded font-mono transition-colors ${
                        codeLang === lang
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <pre className="text-xs font-mono bg-muted/50 rounded border border-border p-3 overflow-auto max-h-52 whitespace-pre">
                  {ep[codeLang]}
                </pre>
              </div>

              <ApiEndpointCard
                endpoint={ep.id}
                method="GET"
                description={ep.description}
                price={ep.price}
                category={ep.category}
                asButton
              />
            </div>
          </div>
        </div>

        {/* x402 Integration */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">x402 Payment Protocol</h2>
          <p className="text-sm text-muted-foreground">
            Kosyn implements the x402 standard — an HTTP-native micropayment
            protocol. APIs return{" "}
            <code className="font-mono bg-muted px-1 rounded">
              402 Payment Required
            </code>{" "}
            with structured payment instructions. Your client pays on-chain,
            then retries with the transaction hash as proof. No API keys. No
            accounts. Just a wallet.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "Detect Payment Required",
                code: `GET /api/data/demographics
← 402
{
  "x402Version": 1,
  "accepts": [{
    "network": "eip155:43113",
    "maxAmountRequired":
      "10000000000000000000",
    "payTo": "0xDataMarketplace",
    "currency": "KUSD"
  }]
}`,
              },
              {
                step: "02",
                title: "Pay On-Chain",
                code: `// 1. Approve KUSD spend
kusd.approve(DataMarketplace, amt)

// 2. Submit query payment
// emits QuerySubmitted(id, caller, amt)
const tx = marketplace
  .submitQuery(
    "demographics",
    10 * 10**18
  )`,
              },
              {
                step: "03",
                title: "Retry with Proof",
                code: `GET /api/data/demographics
X-Payment: <tx_hash>

← 200
{
  "total_patients": 847,
  "age_distribution": {
    "18-30": 23, "31-45": 38,
    "46-60": 28, "60+": 11
  }
}`,
              },
            ].map(({ step, title, code }) => (
              <div
                key={step}
                className="rounded-lg border border-border p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                    {step}
                  </span>
                  <p className="text-sm font-medium">{title}</p>
                </div>
                <pre className="text-xs font-mono bg-muted/50 p-2 rounded border border-border overflow-auto whitespace-pre">
                  {code}
                </pre>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                CRE Distribution:{" "}
              </span>
              Each payment triggers a Chainlink CRE workflow inside a TEE
              enclave. The workflow reads active patient listings from the
              DataMarketplace contract, computes proportional KUSD shares, and
              distributes to each contributing patient wallet — fully on-chain,
              no intermediaries, verified by the DON.
            </p>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Claude Integration Skill</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Install this skill into Claude Code to get AI-assisted x402
                integration for your app
              </p>
            </div>

            {/* CLI install */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Install via CLI
              </p>
              <SkillInstallCommand baseUrl={baseUrl} />
            </div>

            {/* Downloads */}
            <div className="flex items-center gap-2 pt-1">
              <a href="/kosyn-x402-skill.zip" download="kosyn-x402-skill.zip">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download ZIP
                </Button>
              </a>
              <a href="/kosyn-x402-skill.md" download="kosyn-x402-skill.md">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .md
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
