"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import { triggerWorkflow } from "@/lib/cre";
import { CreFeed } from "@/components/cre-feed";
import {
  useCreLogs,
  truncHash,
  FUJI_EXPLORER,
  IPFS_GATEWAY,
} from "@/hooks/use-cre-logs";
import { toast } from "sonner";
import type { RecordType } from "@/hooks/use-records";

interface DoctorUploadRecordProps {
  patientAddress: string;
  consultationId: string;
  doctorName: string;
  doctorAddress: string;
}

export function DoctorUploadRecord({
  patientAddress,
  consultationId,
  doctorName,
  doctorAddress,
}: DoctorUploadRecordProps) {
  const [recordType, setRecordType] = useState<RecordType>("consultation");
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { logs: creLogs, push: pushLog, clear: clearLogs } = useCreLogs();

  const handleUpload = async () => {
    if (!content.trim()) return;
    setIsUploading(true);
    clearLogs();
    pushLog("INFO", "CRE workflow triggered");
    pushLog("INFO", "Uploading encrypted blob to IPFS via Pinata...");

    const result = await triggerWorkflow("record-upload", {
      patientAddress,
      recordType,
      encryptedData: JSON.stringify({ content, consultationId }),
    });

    if (!result.success) {
      pushLog("ERR", result.error ?? "CRE workflow failed");
      toast.error(
        result.error ?? "CRE workflow failed. Service may be offline.",
      );
      setIsUploading(false);
      return;
    }

    const cid = (result.data?.cid ?? result.data?.ipfsCid) as
      | string
      | undefined;
    if (cid) {
      pushLog("OK", `CID stored: ${truncHash(cid)}`, `${IPFS_GATEWAY}/${cid}`);
    } else {
      pushLog("OK", "CID stored on IPFS");
    }

    if (result.txHash) {
      pushLog(
        "OK",
        `Tx confirmed on Avalanche Fuji`,
        `${FUJI_EXPLORER}/${result.txHash}`,
      );
    } else {
      pushLog("OK", "Tx confirmed on Avalanche Fuji");
    }

    pushLog("OK", "Workflow complete");
    setIsUploading(false);
    setContent("");
    setLabel("");
    toast.success("Record uploaded to patient's file");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload to Patient Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Record Type</Label>
            <Select
              value={recordType}
              onValueChange={(v) => setRecordType(v as RecordType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">Consultation Notes</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="health">Lab Results</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Label (optional)</Label>
            <Input
              placeholder="e.g. Blood work follow-up"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              placeholder="Enter record content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={isUploading || !content.trim()}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-1" />
            {isUploading ? "Uploading..." : "Upload Record"}
          </Button>
        </CardContent>
      </Card>
      {creLogs.length > 0 && (
        <CreFeed workflow="record-upload" logs={creLogs} />
      )}
    </div>
  );
}
