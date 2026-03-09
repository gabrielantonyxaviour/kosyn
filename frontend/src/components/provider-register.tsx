"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreFeed } from "@/components/cre-feed";
import { buildJurisdiction } from "@/lib/locations";
import { LocationCombobox } from "@/components/location-combobox";
import {
  Upload,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Loader2,
  FileCheck,
  Fingerprint,
  RefreshCw,
  Search,
  BadgeCheck,
  XCircle,
  LogOut,
} from "lucide-react";
import { triggerWorkflow } from "@/lib/cre";
import { useCreLogs, truncHash, FUJI_EXPLORER } from "@/hooks/use-cre-logs";
import { toast } from "sonner";
import {
  useActiveAccount,
  useDisconnect,
  useActiveWallet,
} from "thirdweb/react";
import { useRouter } from "next/navigation";
import { usePasskey } from "@/hooks/use-passkey";

const PROVIDER_KEY = (address: string) =>
  `kosyn-provider:${address.toLowerCase()}`;

const specialties = [
  "Internal Medicine",
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Pediatrics",
  "Psychiatry",
  "Orthopedics",
  "Oncology",
];

// Real NPI numbers from the US National Provider Identifier Registry
const mockDoctors = [
  { npi: "1710071717", fee: "75" },
  { npi: "1639311244", fee: "90" },
  { npi: "1043324007", fee: "60" },
  { npi: "1740275312", fee: "85" },
  { npi: "1356872006", fee: "70" },
  { npi: "1255652087", fee: "130" },
  { npi: "1790762623", fee: "80" },
  { npi: "1598298242", fee: "95" },
  { npi: "1881198588", fee: "90" },
  { npi: "1689162596", fee: "100" },
  { npi: "1619181559", fee: "110" },
  { npi: "1891835658", fee: "85" },
  { npi: "1528076718", fee: "75" },
  { npi: "1962778159", fee: "120" },
  { npi: "1982833471", fee: "95" },
];

interface NpiResult {
  valid: boolean;
  npi?: string;
  name?: string;
  credential?: string;
  specialty?: string;
  state?: string;
  status?: string;
  error?: string;
}

type SubmitStage =
  | "idle"
  | "uploading-cert"
  | "cre-verifying"
  | "passkey-register"
  | "done"
  | "error";

export function ProviderRegister() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const {
    register: registerPasskey,
    isLoading: passkeyLoading,
    supported: passkeySupported,
  } = usePasskey();

  const [step, setStep] = useState<1 | 2>(1);
  const [npiInput, setNpiInput] = useState("");
  const [npiVerified, setNpiVerified] = useState<NpiResult | null>(null);
  const [npiLoading, setNpiLoading] = useState(false);
  const [fee, setFee] = useState("");
  const [jurCountry, setJurCountry] = useState("");
  const [jurRegion, setJurRegion] = useState("");
  const [certificate, setCertificate] = useState<File | null>(null);
  const [certCid, setCertCid] = useState<string | null>(null);
  const [licenseHash, setLicenseHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [stage, setStage] = useState<SubmitStage>("idle");
  const [stageError, setStageError] = useState<string | null>(null);
  const [creActive, setCreActive] = useState(false);
  const { logs: creLogs, push: pushLog, clear: clearLogs } = useCreLogs();

  const isSubmitting =
    stage === "uploading-cert" ||
    stage === "cre-verifying" ||
    stage === "passkey-register";

  const verifyNpi = async (npi?: string) => {
    const value = npi ?? npiInput.trim();
    if (!/^\d{10}$/.test(value)) {
      toast.error("NPI must be a 10-digit number");
      return;
    }
    setNpiLoading(true);
    setNpiVerified(null);
    try {
      const res = await fetch(`/api/npi/verify?npi=${value}`);
      const data: NpiResult = await res.json();
      setNpiVerified(data);
      if (data.valid) {
        toast.success(`Verified: ${data.name} (${data.credential ?? "MD"})`);
      } else if (data.error) {
        toast.error(data.error);
      } else {
        toast.error("NPI not found or provider is inactive");
      }
    } catch {
      toast.error("Failed to reach NPI registry");
    } finally {
      setNpiLoading(false);
    }
  };

  const handleMockDoctor = async () => {
    const doc = mockDoctors[Math.floor(Math.random() * mockDoctors.length)];
    setNpiInput(doc.npi);
    setFee(doc.fee);
    setNpiVerified(null);
    // Auto-verify after setting
    setNpiLoading(true);
    try {
      const res = await fetch(`/api/npi/verify?npi=${doc.npi}`);
      const data: NpiResult = await res.json();
      setNpiVerified(data);
      if (data.valid) {
        toast.success(`Verified: ${data.name} (${data.credential ?? "MD"})`);
      }
    } catch {
      toast.error("Failed to reach NPI registry");
    } finally {
      setNpiLoading(false);
    }
  };

  const [passkeyCredId, setPasskeyCredId] = useState<string | null>(null);

  const handlePasskeyRegister = async () => {
    try {
      const cred = await registerPasskey(npiVerified?.name ?? "Provider");
      if (cred) {
        setPasskeyCredId(cred.id);
      }
      toast.success("Passkey registered. Starting on-chain registration...");
      // After passkey succeeds, trigger CRE workflow
      await triggerCreWorkflow(cred?.id ?? null);
    } catch {
      toast.error("Passkey registration failed. Please try again.");
    }
  };

  const step1Valid =
    npiVerified?.valid === true &&
    fee.trim() !== "" &&
    jurCountry !== "" &&
    jurRegion !== "";

  const computeLicenseHash = async (npi: string): Promise<string> => {
    const hashBuf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(npi),
    );
    return (
      "0x" +
      Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !npiVerified?.valid) return;
    setStageError(null);

    // Upload certificate to IPFS if provided
    if (certificate) {
      setStage("uploading-cert");
      try {
        const base64 = await fileToBase64(certificate);
        const res = await fetch("/api/ipfs/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              filename: certificate.name,
              contentType: certificate.type,
              data: base64,
            },
            filename: "kosyn-provider-cert",
          }),
        });
        const json = (await res.json()) as { cid?: string; error?: string };
        if (!res.ok || !json.cid)
          throw new Error(json.error ?? "IPFS upload failed");
        setCertCid(json.cid);
      } catch (err) {
        setStage("error");
        setStageError(
          err instanceof Error ? err.message : "Certificate upload failed",
        );
        return;
      }
    }

    // Show passkey registration — CRE workflow triggers after passkey
    setStage("passkey-register");
  };

  const triggerCreWorkflow = async (credId: string | null) => {
    if (!account || !npiVerified?.valid) return;

    setStage("cre-verifying");
    setCreActive(true);
    clearLogs();
    pushLog("INFO", "CRE workflow triggered");
    try {
      pushLog("INFO", "Computing NPI hash (SHA-256)...");
      const hash = await computeLicenseHash(npiVerified.npi!);
      setLicenseHash(hash);
      pushLog("OK", `NPI hash: ${truncHash(hash)}`);

      pushLog(
        "INFO",
        `NPI verified: ${npiVerified.name} — ${npiVerified.specialty}`,
      );
      pushLog("INFO", "Registering provider via CRE TEE...");
      const result = await triggerWorkflow("provider-registration", {
        providerAddress: account.address,
        name: npiVerified.name,
        specialty: npiVerified.specialty,
        credential: npiVerified.credential,
        licenseNumber: npiVerified.npi,
        jurisdiction: buildJurisdiction(jurCountry, jurRegion),
        fee: parseInt(fee) || 50,
        certCid: certCid ?? "no-cert",
        licenseHash: hash,
      });

      if (!result.success) {
        pushLog("ERR", result.error ?? "CRE verification failed");
        throw new Error(result.error ?? "CRE verification failed");
      }

      const returnedTx = result.txHash ?? null;
      setTxHash(returnedTx);

      if (returnedTx) {
        pushLog(
          "OK",
          `Tx confirmed on Avalanche Fuji`,
          `${FUJI_EXPLORER}/${returnedTx}`,
        );
      }
      pushLog("OK", "Provider registered on-chain");
      pushLog("OK", "Workflow complete");

      localStorage.setItem(
        PROVIDER_KEY(account.address),
        JSON.stringify({
          name: npiVerified.name,
          specialty: npiVerified.specialty,
          credential: npiVerified.credential,
          npi: npiVerified.npi,
          jurisdiction: buildJurisdiction(jurCountry, jurRegion),
          licenseHash: hash,
          certCid,
          txHash: returnedTx,
          fee: parseInt(fee) || 50,
          passkeyCredentialId: credId,
          registeredAt: new Date().toISOString(),
        }),
      );

      setStage("done");
    } catch (err) {
      setStage("error");
      setStageError(err instanceof Error ? err.message : "Registration failed");
      setCreActive(false);
    }
  };

  return (
    <div className="max-h-[calc(100vh-4rem)] overflow-y-auto space-y-6 px-1">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Provider Registration</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Register as a verified healthcare provider on Kosyn
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step === 1
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary"
            }`}
          >
            {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
          </div>
          <span
            className={`text-sm ${step === 1 ? "font-medium" : "text-muted-foreground"}`}
          >
            NPI Verification
          </span>
        </div>
        <div className="h-px w-8 bg-border" />
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step === 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </div>
          <span
            className={`text-sm ${step === 2 ? "font-medium" : "text-muted-foreground"}`}
          >
            Verify & Register
          </span>
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="rounded-lg border border-border p-6 space-y-5">
          <div className="space-y-4">
            {/* NPI input + verify */}
            <div className="space-y-2">
              <Label htmlFor="npi">NPI Number</Label>
              <p className="text-xs text-muted-foreground">
                Your 10-digit National Provider Identifier from the US NPI
                Registry
              </p>
              <div className="flex gap-2">
                <Input
                  id="npi"
                  value={npiInput}
                  onChange={(e) => {
                    const v = e.target.value
                      .replace(/[^0-9]/g, "")
                      .slice(0, 10);
                    setNpiInput(v);
                    if (npiVerified) setNpiVerified(null);
                  }}
                  placeholder="1234567890"
                  className="font-mono"
                  maxLength={10}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => verifyNpi()}
                  disabled={npiInput.length !== 10 || npiLoading}
                  className="shrink-0"
                >
                  {npiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* NPI verification result */}
            {npiVerified && (
              <div
                className={`rounded-lg border p-4 space-y-2 ${
                  npiVerified.valid
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                {npiVerified.valid ? (
                  <>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">
                        Verified Provider
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {npiVerified.name}
                      </p>
                      {npiVerified.credential && (
                        <p>
                          <span className="text-muted-foreground">
                            Credential:
                          </span>{" "}
                          {npiVerified.credential}
                        </p>
                      )}
                      {npiVerified.specialty && (
                        <p>
                          <span className="text-muted-foreground">
                            Specialty:
                          </span>{" "}
                          {npiVerified.specialty}
                        </p>
                      )}
                      {npiVerified.state && (
                        <p>
                          <span className="text-muted-foreground">State:</span>{" "}
                          {npiVerified.state}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-400">
                      {npiVerified.error ??
                        "NPI not found or provider is inactive"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Jurisdiction — only show after NPI verified */}
            {npiVerified?.valid && (
              <>
                <div className="space-y-2">
                  <Label>Practice Jurisdiction</Label>
                  <LocationCombobox
                    selectedCountry={jurCountry}
                    selectedRegion={jurRegion}
                    onCountryChange={(code) => {
                      setJurCountry(code);
                      setJurRegion("");
                    }}
                    onRegionChange={setJurRegion}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee">Consultation Fee (KUSD)</Label>
                  <Input
                    id="fee"
                    type="text"
                    inputMode="decimal"
                    value={fee}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9.]/g, "");
                      setFee(v);
                    }}
                    placeholder="50"
                  />
                </div>
              </>
            )}
          </div>
          <Button
            onClick={() => setStep(2)}
            disabled={!step1Valid}
            className="w-full"
          >
            Continue <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <button
            type="button"
            onClick={handleMockDoctor}
            disabled={npiLoading}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${npiLoading ? "animate-spin" : ""}`}
            />
            Generate Real Doctor
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border border-border p-6 space-y-5">
            {/* Verified provider summary */}
            {npiVerified?.valid && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium">
                    {npiVerified.name}
                  </span>
                  {npiVerified.credential && (
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {npiVerified.credential}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  NPI {npiVerified.npi} · {npiVerified.specialty} ·{" "}
                  {npiVerified.state}
                </p>
              </div>
            )}

            {/* Certificate upload */}
            <div className="space-y-2">
              <Label htmlFor="cert">Medical Certificate (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Uploaded to IPFS inside the TEE — raw file never touches Kosyn
                servers
              </p>
              <Input
                id="cert"
                type="file"
                accept=".pdf,.jpg,.png"
                onChange={(e) => {
                  setCertCid(null);
                  setCertificate(e.target.files?.[0] || null);
                }}
                className="text-xs"
              />
              {certificate && !certCid && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <FileCheck className="h-3 w-3" />
                  {certificate.name} — will be uploaded on submit
                </p>
              )}
              {certCid && (
                <div className="rounded bg-muted/40 border border-border px-2.5 py-1.5 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Certificate IPFS CID
                  </p>
                  <a
                    href={`https://ipfs.io/ipfs/${certCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1 break-all"
                  >
                    ipfs://{certCid}
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* CRE explanation */}
            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                What happens next
              </p>
              <div className="space-y-2.5 text-xs text-muted-foreground">
                {[
                  "Your NPI has been verified against the US National Provider Identifier Registry. The NPI hash is computed client-side.",
                  "The CRE TEE cross-references your NPI with on-chain data and issues a verifiable credential to your wallet.",
                  "An on-chain credential is issued via the CRE forwarder, authorizing you to request patient data.",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Badge
                      variant="outline"
                      className="shrink-0 mt-0.5 text-[10px] px-1.5 py-0"
                    >
                      {i + 1}
                    </Badge>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Lock className="h-3 w-3 text-emerald-400" />
                <span className="text-[11px] text-emerald-400">
                  Your raw credentials never leave the enclave
                </span>
              </div>
            </div>

            {/* CRE feed */}
            {creActive && (
              <CreFeed workflow="provider-registration" logs={creLogs} />
            )}

            {/* NPI hash reveal */}
            {licenseHash && (
              <div className="rounded bg-muted/40 border border-border px-2.5 py-1.5 space-y-0.5">
                <p className="text-[10px] text-muted-foreground font-mono">
                  NPI hash (SHA-256)
                </p>
                <p className="text-[10px] font-mono text-foreground/70 break-all">
                  {licenseHash}
                </p>
              </div>
            )}

            {/* Tx hash reveal */}
            {txHash && (
              <div className="rounded bg-muted/40 border border-border px-2.5 py-1.5 space-y-0.5">
                <p className="text-[10px] text-muted-foreground font-mono">
                  On-chain tx (Avalanche Fuji)
                </p>
                <a
                  href={`https://testnet.snowtrace.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1 break-all"
                >
                  {txHash}
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </a>
              </div>
            )}

            {stageError && (
              <div className="space-y-1">
                <p className="text-xs text-red-400">{stageError}</p>
                <p className="text-xs text-muted-foreground">
                  The CRE service may be offline. Contact{" "}
                  <a
                    href="mailto:gabrielantony56@gmail.com"
                    className="underline text-primary hover:text-primary/80"
                  >
                    gabrielantony56@gmail.com
                  </a>{" "}
                  to have it turned back on.
                </p>
              </div>
            )}
          </div>

          {stage === "passkey-register" && (
            <div className="rounded-lg border border-border p-6 space-y-4 text-center">
              <Fingerprint className="h-10 w-10 text-primary mx-auto" />
              <div>
                <p className="text-sm font-medium">Register Identity Passkey</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your passkey authenticates record access during consultations.
                  This is required to complete registration.
                </p>
              </div>
              {!passkeySupported && (
                <p className="text-xs text-amber-400">
                  Passkeys are not supported in this browser. Try Chrome or
                  Safari.
                </p>
              )}
              <Button
                onClick={handlePasskeyRegister}
                disabled={passkeyLoading || !passkeySupported}
                className="w-full"
              >
                {passkeyLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Registering…
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4 mr-1" />
                    Register Passkey
                  </>
                )}
              </Button>
            </div>
          )}

          {stage === "cre-verifying" && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Registering on-chain…
              </span>
            </div>
          )}

          {stage !== "passkey-register" && stage !== "cre-verifying" && (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={stage === "done" || stage === "uploading-cert"}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              {stage === "done" ? (
                <Button
                  type="button"
                  onClick={() => router.push("/doctors/dashboard")}
                  className="flex-[2]"
                >
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={stage === "uploading-cert"}
                  className="flex-[2]"
                >
                  {stage === "uploading-cert" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Uploading cert…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Verify & Register
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </form>
      )}

      {/* Wallet info + Logout button */}
      {!isSubmitting && stage !== "done" && (
        <div className="flex flex-col items-center gap-1">
          {account && (
            <p className="text-xs text-muted-foreground font-mono">
              Your wallet: {account.address.slice(0, 6)}…
              {account.address.slice(-4)}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (wallet) disconnect(wallet);
            }}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors w-full py-1"
          >
            <LogOut className="h-3 w-3" />
            Sign out and use a different account
          </button>
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
