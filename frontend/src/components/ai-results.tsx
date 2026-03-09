"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { NillionProofInline } from "@/components/nillion-proof-badge";

interface AiResultsProps {
  proof?: { signature: string; model: string; timestamp?: number };
  results: {
    soapNote?: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
    summary?: string;
    medicalCodes?: {
      icd10: string[];
      cpt: string[];
    };
    drugInteractions?: Array<{
      drugs: string[];
      severity: "low" | "moderate" | "high";
      description: string;
    }>;
    riskScores?: Record<string, number>;
  };
}

const severityColors = {
  low: "bg-green-500/10 text-green-400 border-green-500/20",
  moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function AiResults({ results, proof }: AiResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Clinical Analysis</CardTitle>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <NillionProofInline proof={proof} />
          <span>— PII stripped before analysis.</span>
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="soap">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="soap">SOAP Note</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="codes">Codes</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
          </TabsList>

          <TabsContent value="soap" className="space-y-3 mt-4">
            {results.soapNote &&
              (["subjective", "objective", "assessment", "plan"] as const).map(
                (section) => (
                  <div key={section} className="space-y-1">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {section}
                    </p>
                    <p className="text-sm">{results.soapNote![section]}</p>
                  </div>
                ),
              )}
          </TabsContent>

          <TabsContent value="summary" className="mt-4 space-y-4">
            <p className="text-sm">{results.summary}</p>
            {results.riskScores && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Risk Scores
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(results.riskScores).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border border-border p-2"
                    >
                      <span className="text-xs capitalize">{key}</span>
                      <span
                        className={`text-sm font-mono font-bold ${
                          val > 50
                            ? "text-red-400"
                            : val > 25
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }`}
                      >
                        {val}/100
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="codes" className="mt-4 space-y-3">
            {results.medicalCodes && (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    ICD-10 Diagnoses
                  </p>
                  {results.medicalCodes.icd10.map((code) => (
                    <Badge
                      key={code}
                      variant="outline"
                      className="mr-1 mb-1 text-xs"
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    CPT Procedures
                  </p>
                  {results.medicalCodes.cpt.map((code) => (
                    <Badge
                      key={code}
                      variant="outline"
                      className="mr-1 mb-1 text-xs"
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="interactions" className="mt-4 space-y-3">
            {results.drugInteractions?.map((interaction, i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium">
                    {interaction.drugs.join(" + ")}
                  </span>
                  <Badge
                    variant="outline"
                    className={severityColors[interaction.severity]}
                  >
                    {interaction.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {interaction.description}
                </p>
              </div>
            ))}
            {(!results.drugInteractions ||
              results.drugInteractions.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No drug interactions detected.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
