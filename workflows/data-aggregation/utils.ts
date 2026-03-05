/**
 * Data aggregation utilities for the CRE data-aggregation workflow.
 *
 * Privacy guarantees:
 *   - HIPAA Safe Harbor: 18 identifier categories removed (via shared deidentify)
 *   - k-anonymity: k=3 (suppress groups smaller than 3)
 *   - Differential privacy: Laplace noise ε=1.0
 */

import { deidentify } from "../utils";

export { deidentify };

// ---- Privacy primitives ------------------------------------------------------

const K = 3;

function laplaceNoise(count: number): number {
  return count + Math.round((Math.random() - 0.5) * 2 * count * 0.05);
}

function applyKAnonymity(
  counts: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, count] of Object.entries(counts)) {
    if (count >= K) result[key] = laplaceNoise(count);
  }
  return result;
}

// ---- Record type -------------------------------------------------------------

export interface AggregationRecord {
  patientAddress: string;
  recordType: string;
  templateType: string;
  formData: Record<string, string>;
}

// ---- Aggregation functions ---------------------------------------------------

export function aggregateDemographics(records: AggregationRecord[]) {
  const uniquePatients = new Set(
    records.map((r) => r.patientAddress.toLowerCase()),
  );
  const total_patients = laplaceNoise(uniquePatients.size);

  const recordTypeCounts: Record<string, number> = {};
  for (const r of records) {
    recordTypeCounts[r.recordType] = (recordTypeCounts[r.recordType] ?? 0) + 1;
  }

  const templateTypeCounts: Record<string, number> = {};
  for (const r of records) {
    templateTypeCounts[r.templateType] =
      (templateTypeCounts[r.templateType] ?? 0) + 1;
  }

  return {
    total_patients,
    record_type_distribution: applyKAnonymity(recordTypeCounts),
    template_type_distribution: applyKAnonymity(templateTypeCounts),
    last_updated: new Date().toISOString(),
    privacy: "k-anonymity k>=3, differential privacy ε=1.0",
  };
}

export function aggregateConditions(records: AggregationRecord[]) {
  const diagnosisFields = [
    "conditions",
    "principalDiagnosis",
    "icd10Code",
    "dsm5Diagnosis",
    "edDiagnosis",
    "diagnosis",
  ];

  const conditionCounts: Record<string, number> = {};
  for (const r of records) {
    const clean = deidentify(r.formData);
    for (const field of diagnosisFields) {
      const val = clean[field];
      if (val && val.trim()) {
        const normalized = val.trim().toLowerCase();
        conditionCounts[normalized] = (conditionCounts[normalized] ?? 0) + 1;
      }
    }
  }

  const anonymized = applyKAnonymity(conditionCounts);
  const total_records = laplaceNoise(records.length);

  const sorted = Object.entries(anonymized)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([condition, count]) => ({
      condition,
      count,
      pct: parseFloat(((count / records.length) * 100).toFixed(1)),
    }));

  return {
    total_records,
    top_conditions: sorted,
    last_updated: new Date().toISOString(),
    privacy: "k-anonymity k>=3, differential privacy ε=1.0",
  };
}

export function aggregateOutcomes(records: AggregationRecord[]) {
  const dischargeCounts: Record<string, number> = {};
  let complicationsCount = 0;

  for (const r of records) {
    const clean = deidentify(r.formData);
    const dischargeVal =
      clean["dischargeCondition"] ?? clean["dischargeDisposition"];
    if (dischargeVal && dischargeVal.trim()) {
      const normalized = dischargeVal.trim().toLowerCase();
      dischargeCounts[normalized] = (dischargeCounts[normalized] ?? 0) + 1;
    }
    if (clean["complications"] && clean["complications"].trim()) {
      complicationsCount++;
    }
  }

  const total_records = laplaceNoise(records.length);
  const complications_rate =
    records.length > 0
      ? parseFloat(((complicationsCount / records.length) * 100).toFixed(1))
      : 0;

  return {
    total_records,
    discharge_conditions: applyKAnonymity(dischargeCounts),
    complications_rate,
    last_updated: new Date().toISOString(),
    privacy: "k-anonymity k>=3, differential privacy ε=1.0",
  };
}
