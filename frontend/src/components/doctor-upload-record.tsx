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
import { createRecord } from "@/lib/demo-api";
import { CreFeed } from "@/components/cre-feed";
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
  const [creActive, setCreActive] = useState(false);

  const handleUpload = async () => {
    if (!content.trim()) return;
    setIsUploading(true);
    setCreActive(true);

    await createRecord({
      patientAddress,
      recordType,
      templateType: "doctor-upload",
      label: label || `${doctorName} — ${recordType}`,
      createdBy: "doctor",
      createdByAddress: doctorAddress,
      formData: { content, consultationId },
    });

    setTimeout(() => {
      setCreActive(false);
      setIsUploading(false);
      setContent("");
      setLabel("");
      toast.success("Record uploaded to patient's file");
    }, 3000);
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
      {creActive && <CreFeed workflow="record-upload" isActive={creActive} />}
    </div>
  );
}
