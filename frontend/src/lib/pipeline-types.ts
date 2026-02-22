export interface PipelineTest {
  name: string;
  status: "pass" | "fail" | "error" | "skipped";
  duration?: number;
  message?: string;
  steps?: string[];
  tags?: string[];
}

export interface PipelineResult {
  pipeline: string;
  displayName: string;
  status: "pass" | "fail" | "error" | "skipped";
  lastRun: string;
  duration: number;
  summary: string;
  output?: string;
  tests?: PipelineTest[];
}

export interface PipelineResults {
  generatedAt: string;
  pipelines: PipelineResult[];
}
