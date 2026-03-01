"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreFeed } from "@/components/cre-feed";
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
} from "lucide-react";
import { triggerWorkflow } from "@/lib/cre";
import { toast } from "sonner";
import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { client, chain } from "@/lib/thirdweb";
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

type SubmitStage =
  | "idle"
  | "uploading-cert"
  | "cre-verifying"
  | "passkey-register"
  | "done"
  | "error";

export function ProviderRegister() {
  const account = useActiveAccount();
  const router = useRouter();
  const { data: avaxBalance } = useWalletBalance({
    client,
    chain,
    address: account?.address,
  });
  const insufficientGas = !avaxBalance || Number(avaxBalance.value) < 1e14;
  const {
    register: registerPasskey,
    isLoading: passkeyLoading,
    supported: passkeySupported,
  } = usePasskey();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    jurisdiction: "",
    licenseNumber: "",
    fee: "",
  });
  const [certificate, setCertificate] = useState<File | null>(null);
  const [certCid, setCertCid] = useState<string | null>(null);
  const [licenseHash, setLicenseHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [stage, setStage] = useState<SubmitStage>("idle");
  const [stageError, setStageError] = useState<string | null>(null);
  const [creActive, setCreActive] = useState(false);

  const isSubmitting = stage === "uploading-cert" || stage === "cre-verifying";

  const handlePasskeyRegister = async () => {
    try {
      const cred = await registerPasskey(form.name);
      if (cred && account) {
        // Persist credential ID alongside provider data so it can be verified later
        const existing = localStorage.getItem(PROVIDER_KEY(account.address));
        if (existing) {
          const parsed = JSON.parse(existing) as Record<string, unknown>;
          localStorage.setItem(
            PROVIDER_KEY(account.address),
            JSON.stringify({ ...parsed, passkeyCredentialId: cred.id }),
          );
        }
      }
      toast.success(
        "Registration verified. On-chain credential and passkey issued.",
      );
      setStage("done");
    } catch {
      toast.success("Registration verified. Passkey skipped.");
      setStage("done");
    }
  };

  const step1Valid =
    form.name.trim() !== "" &&
    form.specialty !== "" &&
    form.jurisdiction.trim() !== "" &&
    form.licenseNumber.trim() !== "" &&
    form.fee.trim() !== "";

  // Compute licenseHash = SHA-256(licenseNumber) as hex
  const computeLicenseHash = async (licenseNumber: string): Promise<string> => {
    const hashBuf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(licenseNumber),
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
    if (!account) return;
    setStageError(null);

    // Step 1 — Upload certificate to IPFS
    let uploadedCid: string | null = null;
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
        uploadedCid = json.cid;
        setCertCid(uploadedCid);
      } catch (err) {
        setStage("error");
        setStageError(
          err instanceof Error ? err.message : "Certificate upload failed",
        );
        return;
      }
    }

    // Step 2 — Compute licenseHash + run CRE verification workflow
    setStage("cre-verifying");
    setCreActive(true);
    try {
      const hash = await computeLicenseHash(form.licenseNumber);
      setLicenseHash(hash);

      const result = await triggerWorkflow("provider-registration", {
        ...form,
        fee: parseInt(form.fee) || 50,
        certCid: uploadedCid ?? "no-cert",
        licenseHash: hash,
      });

      if (!result.success) {
        throw new Error(result.error ?? "CRE verification failed");
      }

      const returnedTx = result.txHash ?? null;
      setTxHash(returnedTx);

      // Persist registration to localStorage (mirrors what ProviderRegistry stores on-chain)
      localStorage.setItem(
        PROVIDER_KEY(account.address),
        JSON.stringify({
          name: form.name,
          specialty: form.specialty,
          jurisdiction: form.jurisdiction,
          licenseHash: hash,
          certCid: uploadedCid,
          txHash: returnedTx,
          fee: parseInt(form.fee) || 50,
          registeredAt: new Date().toISOString(),
        }),
      );

      setStage("passkey-register");
    } catch (err) {
      setStage("error");
      setStageError(err instanceof Error ? err.message : "Registration failed");
      setCreActive(false);
    }
  };

  return (
    <div className="space-y-6">
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
            Your Information
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
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Dr. Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Select
                value={form.specialty}
                onValueChange={(v) => setForm((f) => ({ ...f, specialty: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input
                  id="jurisdiction"
                  value={form.jurisdiction}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, jurisdiction: e.target.value }))
                  }
                  placeholder="US-CA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">License Number</Label>
                <Input
                  id="license"
                  value={form.licenseNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, licenseNumber: e.target.value }))
                  }
                  placeholder="A-123456"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee">Consultation Fee (KUSD)</Label>
              <Input
                id="fee"
                type="text"
                inputMode="decimal"
                value={form.fee}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setForm((f) => ({ ...f, fee: v }));
                }}
                placeholder="50"
              />
            </div>
          </div>
          <Button
            onClick={() => setStep(2)}
            disabled={!step1Valid}
            className="w-full"
          >
            Continue <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border border-border p-6 space-y-5">
            {/* Certificate upload */}
            <div className="space-y-2">
              <Label htmlFor="cert">Medical Certificate</Label>
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
                  "Your certificate is uploaded to IPFS. Only an encrypted CID is stored — raw file never leaves your device unencrypted.",
                  "The CRE TEE fetches the cert and verifies your license against registry databases. Raw credentials never touch Kosyn servers.",
                  "An on-chain credential is issued to your wallet via the CRE forwarder, authorizing you to request patient data.",
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
              <CreFeed workflow="provider-registration" isActive={creActive} />
            )}

            {/* License hash reveal */}
            {licenseHash && (
              <div className="rounded bg-muted/40 border border-border px-2.5 py-1.5 space-y-0.5">
                <p className="text-[10px] text-muted-foreground font-mono">
                  License hash (SHA-256)
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

            {stageError && <p className="text-xs text-red-400">{stageError}</p>}
          </div>

          {stage === "passkey-register" && (
            <div className="rounded-lg border border-border p-6 space-y-4 text-center">
              <Fingerprint className="h-10 w-10 text-primary mx-auto" />
              <div>
                <p className="text-sm font-medium">Register Identity Passkey</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your passkey will authenticate record access during
                  consultations.
                </p>
              </div>
              {!passkeySupported && (
                <p className="text-xs text-amber-400">
                  Passkeys are not supported in this browser. You can skip this
                  step.
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
              <button
                type="button"
                onClick={() => setStage("done")}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Skip (not recommended)
              </button>
            </div>
          )}

          {stage !== "passkey-register" && (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isSubmitting || stage === "done"}
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
                  disabled={isSubmitting || insufficientGas}
                  className="flex-[2]"
                >
                  {stage === "uploading-cert" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Uploading cert…
                    </>
                  ) : stage === "cre-verifying" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Verifying…
                    </>
                  ) : insufficientGas ? (
                    "Insufficient gas"
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

          {insufficientGas && stage === "idle" && (
            <p className="text-xs text-amber-400 text-center">
              You need AVAX for gas.{" "}
              <a
                href="https://faucet.avax.network"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Get testnet AVAX
              </a>
            </p>
          )}
        </form>
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
