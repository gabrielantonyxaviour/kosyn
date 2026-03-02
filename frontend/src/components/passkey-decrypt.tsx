"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, LockOpen, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePasskey } from "@/hooks/use-passkey";
import { type EncryptedBlob } from "@/lib/crypto";

interface PasskeyDecryptProps {
  /** JSON-encoded EncryptedBlob. If provided, real decryption is performed. */
  encryptedBlob?: string;
  onDecrypted?: (plaintext?: string) => void;
  size?: "sm" | "default";
}

export function PasskeyDecrypt({
  encryptedBlob,
  onDecrypted,
  size = "default",
}: PasskeyDecryptProps) {
  const { isLoading, decryptData, verify } = usePasskey();
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleDecrypt = async () => {
    if (encryptedBlob) {
      // Real decryption: parse blob and use PRF-derived key
      let blob: EncryptedBlob;
      try {
        blob = JSON.parse(encryptedBlob) as EncryptedBlob;
      } catch {
        return;
      }

      const plaintext = await decryptData(blob);
      if (plaintext !== null) {
        setDecryptedText(plaintext);
        setOpen(true);
        onDecrypted?.(plaintext);
      }
    } else {
      // Auth-only mode (no blob): just run passkey assertion
      const ok = await verify();
      if (ok) {
        onDecrypted?.();
      }
    }
  };

  if (decryptedText) {
    return (
      <>
        <Button
          variant="outline"
          size={size}
          onClick={() => setOpen(true)}
          className="text-emerald-400 border-emerald-500/20"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LockOpen className="h-4 w-4 text-emerald-400" />
                Decrypted Record
              </DialogTitle>
            </DialogHeader>
            <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(decryptedText), null, 2);
                } catch {
                  return decryptedText;
                }
              })()}
            </pre>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleDecrypt}
      disabled={isLoading}
    >
      <Fingerprint className="h-4 w-4 mr-1" />
      {isLoading ? "Verifying..." : "Decrypt"}
    </Button>
  );
}
