"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getProfileCache, PatientProfileCache } from "@/lib/patient-profile";
import { usePasskey } from "@/hooks/use-passkey";
import type { EncryptedBlob } from "@/lib/crypto";
import {
  Key,
  ExternalLink,
  ShieldCheck,
  User,
  Calendar,
  Lock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ProfilePage() {
  const account = useActiveAccount();
  const { decryptData } = usePasskey();

  const [cache, setCache] = useState<PatientProfileCache | null>(null);
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptAttempted, setDecryptAttempted] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    if (!account) return;
    setCache(getProfileCache(account.address));
  }, [account]);

  const handleDecrypt = async () => {
    if (!cache?.profileCid || isDecrypting) return;
    setDecryptError(null);
    setDecryptAttempted(true);
    setIsDecrypting(true);
    try {
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${cache.profileCid}`,
        `https://ipfs.io/ipfs/${cache.profileCid}`,
      ];
      let raw: string | null = null;
      for (const url of gateways) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            raw = await res.text();
            break;
          }
        } catch {
          /* try next */
        }
      }
      if (!raw) throw new Error("Could not fetch from IPFS");
      const blob = JSON.parse(raw) as EncryptedBlob;
      const decrypted = await decryptData(blob);
      if (!decrypted) throw new Error("Decryption cancelled or failed");
      setProfile(JSON.parse(decrypted));
    } catch (err) {
      setDecryptError(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">
          Connect your wallet to view profile.
        </p>
      </div>
    );
  }

  const truncated = `${account.address.slice(0, 10)}...${account.address.slice(-8)}`;
  const dicebear = `https://api.dicebear.com/9.x/shapes/svg?seed=${account.address}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      {/* Cover + Avatar */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-muted/60 to-muted/20" />
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4">
            <img
              src={profile?.avatarDataUrl ?? dicebear}
              alt="avatar"
              className="h-20 w-20 rounded-full border-4 border-background object-cover"
            />
          </div>
          {profile ? (
            <div className="space-y-1">
              <h1 className="text-xl font-bold">{profile.name}</h1>
              <p className="text-sm text-muted-foreground capitalize">
                {profile.gender?.replace(/-/g, " ")}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Profile encrypted — decrypt to view
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {truncated}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* On-chain / IPFS details */}
      {cache && (
        <div className="rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            On-chain Identity
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-muted-foreground w-28 shrink-0">
                Wallet
              </span>
              <span className="font-mono text-xs break-all">
                {account.address}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-muted-foreground w-28 shrink-0">
                IPFS CID
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs break-all">
                  {cache.profileCid}
                </span>
                <a
                  href={`https://ipfs.io/ipfs/${cache.profileCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-muted-foreground w-28 shrink-0">
                Registered
              </span>
              <span className="text-xs">
                {new Date(cache.completedAt).toLocaleString()}
              </span>
            </div>
            {cache.passkeyCredentialId && (
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground w-28 shrink-0">
                  Passkey ID
                </span>
                <span className="font-mono text-xs break-all text-muted-foreground">
                  {cache.passkeyCredentialId.slice(0, 32)}…
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decrypt section */}
      <div className="rounded-xl border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Key className="h-4 w-4" />
          Encrypted Profile Data
        </h2>
        {!profile ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Your personal details (name, DOB, gender) are AES-256-GCM
              encrypted and stored on IPFS. Decrypting requires your device
              passkey (biometric prompt).
            </p>
            <Button
              onClick={handleDecrypt}
              disabled={isDecrypting || !cache}
              size="sm"
            >
              {isDecrypting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Decrypting…
                </>
              ) : (
                <>
                  <Key className="h-3.5 w-3.5 mr-2" />
                  Decrypt with Passkey
                </>
              )}
            </Button>
            {decryptError && (
              <div className="flex items-start gap-2 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {decryptError}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium">{profile.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{profile.dateOfBirth}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">
                  {profile.gender?.replace(/-/g, " ")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" asChild className="flex-1">
          <Link href="/patients/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
