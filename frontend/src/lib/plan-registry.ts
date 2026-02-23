// ============================================================
// Plan Registry Schema — Project Plan Types & Utilities
// ============================================================
// Structured plan data for project visualization and the /x1
// skill. Maps modules, screens, endpoints, tables, flows,
// UI mockups, phase-1 tests, and execution dependencies.
// ============================================================

// === Core Registry ===

export interface PlanRegistry {
  app: string;
  version: string;
  generatedAt: string;
  description: string;
  techStack: Record<string, string>;
  modules: PlanModule[];
  flows: PlanFlow[];
  infrastructure?: PlanInfrastructure;
  fileStructure: Record<string, string>;
}

export interface PlanModule {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  screens: PlanScreen[];
  apiEndpoints: PlanEndpoint[];
  dbTables: PlanTable[];
  contracts?: string[];
  services?: string[];
}

export interface PlanScreen {
  id: string;
  name: string;
  route: string;
  description: string;
  components: string[];
  roles: string[];
  priority: "critical" | "high" | "medium" | "low";
  status?: "implemented" | "planned";
  dependsOn?: string[]; // other screen IDs this screen requires
  ui?: ScreenUI;
  tests?: PlanTest[];
  appFlows?: AppFlow[];
  states?: ScreenState[];
}

export interface PlanEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  auth: boolean;
  roles: string[];
  request?: Record<string, string>;
  response?: Record<string, string>;
  serverFlow?: EndpointFlow[];
  calledBy?: string[];
  errorResponses?: EndpointError[];
}

export interface PlanTable {
  id: string;
  name: string;
  columns: PlanColumn[];
  relations: PlanRelation[];
}

export interface PlanColumn {
  name: string;
  type: string;
  primary?: boolean;
  unique?: boolean;
  nullable?: boolean;
}

export interface PlanRelation {
  table: string;
  column: string;
  type: "one-to-many" | "many-to-one" | "one-to-one";
}

// === UI Mockup Types ===

export interface ScreenUI {
  layout:
    | "page-with-header"
    | "form"
    | "dashboard-grid"
    | "split-screen"
    | "tabbed"
    | "kanban"
    | "calendar"
    | "detail"
    | "wizard"
    | "centered-card";
  sections: UISection[];
  dialogs?: UIDialog[];
}

export type UISection =
  | UIHeaderSection
  | UIStatsGridSection
  | UIDataTableSection
  | UIFormSection
  | UITabsSection
  | UICardsGridSection
  | UIKanbanSection
  | UICalendarSection
  | UIDetailCardSection
  | UIChartSection
  | UITimelineSection
  | UIProfileHeaderSection
  | UIWizardSection
  | UIContentSection;

// Base for all sections
interface UISectionBase {
  type: string;
  id?: string;
  condition?: UICondition;
}

export interface UICondition {
  role?: string[];
  state?: string;
}

export interface UIHeaderSection extends UISectionBase {
  type: "header";
  title: string;
  subtitle?: string;
  backLink?: string;
  actions?: UIAction[];
}

export interface UIStatsGridSection extends UISectionBase {
  type: "stats-grid";
  columns?: number;
  stats: UIStatCard[];
}

export interface UIStatCard {
  label: string;
  value: string;
  icon?: string;
  trend?: string;
  color?: string;
}

export interface UIDataTableSection extends UISectionBase {
  type: "data-table";
  columns: UITableColumn[];
  filters?: UIFilter[];
  rowActions?: UIAction[];
  pagination?: boolean;
  emptyMessage?: string;
}

export interface UITableColumn {
  key: string;
  label: string;
  type?:
    | "text"
    | "badge"
    | "currency"
    | "date"
    | "actions"
    | "avatar"
    | "link"
    | "number";
  hiddenOn?: "mobile";
}

export interface UIFilter {
  key: string;
  label: string;
  type: "search" | "select" | "date-range" | "multi-select";
  options?: string[];
}

export interface UIFormSection extends UISectionBase {
  type: "form";
  title?: string;
  description?: string;
  columns?: number;
  fields: UIFormField[];
  submitAction: UIAction;
  cancelAction?: UIAction;
}

export interface UIFormField {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "textarea"
    | "select"
    | "date"
    | "number"
    | "currency"
    | "checkbox"
    | "checkbox-grid"
    | "file"
    | "phone"
    | "toggle";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  gridCols?: number;
  showWhen?: { field: string; value: string };
  helperText?: string;
}

export interface UITabsSection extends UISectionBase {
  type: "tabs";
  tabs: UITab[];
}

export interface UITab {
  id: string;
  label: string;
  icon?: string;
  content: UISection[];
  condition?: UICondition;
}

export interface UICardsGridSection extends UISectionBase {
  type: "cards-grid";
  columns?: number;
  cards: UICard[];
}

export interface UICard {
  title: string;
  subtitle?: string;
  icon?: string;
  fields?: { label: string; value: string }[];
  badge?: { label: string; color: string };
  actions?: UIAction[];
  navigateTo?: string;
}

export interface UIKanbanSection extends UISectionBase {
  type: "kanban";
  columns: UIKanbanColumn[];
  cardFields: string[];
  draggable?: boolean;
}

export interface UIKanbanColumn {
  id: string;
  label: string;
  color: string;
  count?: string;
  value?: string;
}

export interface UICalendarSection extends UISectionBase {
  type: "calendar";
  views: ("month" | "week" | "day")[];
  eventTypes: UIEventType[];
  actions?: UIAction[];
}

export interface UIEventType {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface UIDetailCardSection extends UISectionBase {
  type: "detail-card";
  title?: string;
  icon?: string;
  fields: UIDetailField[];
}

export interface UIDetailField {
  label: string;
  value: string;
  type?: "text" | "badge" | "currency" | "date" | "link" | "email" | "phone";
}

export interface UIChartSection extends UISectionBase {
  type: "chart";
  chartType: "line" | "bar" | "pie" | "area" | "donut";
  title: string;
  description?: string;
  dataKeys?: string[];
}

export interface UITimelineSection extends UISectionBase {
  type: "timeline";
  title?: string;
  items?: {
    label: string;
    description?: string;
    time?: string;
    icon?: string;
  }[];
}

export interface UIProfileHeaderSection extends UISectionBase {
  type: "profile-header";
  bannerColor?: string;
  avatar?: string;
  title: string;
  subtitle?: string;
  badges?: { label: string; color: string }[];
  stats?: UIStatCard[];
  actions?: UIAction[];
}

export interface UIWizardSection extends UISectionBase {
  type: "wizard";
  steps: UIWizardStep[];
}

export interface UIWizardStep {
  id: string;
  label: string;
  fields: UIFormField[];
  description?: string;
  component?: string;
}

export interface UIContentSection extends UISectionBase {
  type: "content";
  title?: string;
  description?: string;
  variant?: "info" | "warning" | "success";
}

// === UI Actions ===

export interface UIAction {
  label: string;
  icon?: string;
  variant?: "primary" | "outline" | "ghost" | "destructive" | "secondary";
  action:
    | "navigate"
    | "dialog"
    | "submit"
    | "api-call"
    | "confirm-delete"
    | "download"
    | "toggle";
  target?: string;
  endpoint?: string;
  condition?: UICondition;
  description?: string; // what this action does — shown in mockup tooltip
  pipelineRef?: string; // "contracts:KosynUSD.transfer" | "api:/api/records" | "cre:data-marketplace"
}

// === UI Dialogs ===

export interface UIDialog {
  id: string;
  title: string;
  description?: string;
  fields?: UIFormField[];
  sections?: UISection[];
  submitAction?: UIAction;
  cancelLabel?: string;
}

// === Phase 1 Tests (Legacy — kept for backward compat) ===

export interface PlanTest {
  id: string;
  name: string;
  type: "ui" | "api";
  priority: "critical" | "high" | "medium" | "low";
  steps: PlanTestStep[];
}

export interface PlanTestStep {
  order: number;
  action:
    | "navigate"
    | "fill"
    | "click"
    | "assert-visible"
    | "assert-text"
    | "assert-url"
    | "wait"
    | "select"
    | "upload"
    | "assert-count"
    | "hover";
  target: string;
  value?: string;
  description: string;
}

// === App Flow Logic ===
// Describes complete user journeys through the app.
// Each flow is one scenario (success, error, edge case).
// Steps trace what happens at each layer: UI → API → DB → back to UI.

export interface AppFlow {
  id: string;
  name: string; // e.g., "Successful Login", "Wrong Password"
  trigger: string; // What starts this flow: "User enters email + password, clicks Sign In"
  priority: "critical" | "high" | "medium" | "low";
  steps: AppFlowStep[];
  outcome: string; // Final state: "User lands on /sales/dashboard with session cookie set"
}

export interface AppFlowStep {
  layer:
    | "ui"
    | "api"
    | "server"
    | "db"
    | "middleware"
    | "external"
    | "blockchain"
    | "ai"
    | "contract";
  description: string;
  ref?: string;
  pipelineRef?: string; // pipeline ID to link to a pipeline result (e.g. "record-upload", "forge-test")
}

// === Endpoint Enrichment ===

export interface EndpointFlow {
  order: number;
  layer:
    | "middleware"
    | "validation"
    | "auth"
    | "db"
    | "external"
    | "transform"
    | "response";
  description: string;
}

export interface EndpointError {
  status: number;
  code?: string;
  description: string;
  when: string;
}

// === Infrastructure (cross-cutting shared services) ===

export interface PlanInfrastructure {
  blockchainNetworks?: BlockchainNetwork[];
  externalAPIs?: ExternalAPI[];
  aiServices?: AIService[];
  sharedServices?: SharedService[];
}

export interface BlockchainNetwork {
  id: string;
  name: string;
  chainId: number;
  type: "evm" | "solana" | "other";
  rpcUrl?: string;
  explorerUrl?: string;
  contracts: SmartContract[];
}

export interface SmartContract {
  id: string;
  name: string;
  address?: string;
  abi?: string;
  description: string;
  functions: ContractFunction[];
}

export interface ContractFunction {
  name: string;
  type: "read" | "write" | "event";
  description: string;
  params?: Record<string, string>;
  returns?: string;
}

export interface ExternalAPI {
  id: string;
  name: string;
  baseUrl: string;
  auth: "api-key" | "oauth" | "none";
  description: string;
  endpoints: ExternalEndpoint[];
}

export interface ExternalEndpoint {
  method: string;
  path: string;
  description: string;
}

export interface AIService {
  id: string;
  name: string;
  type: "llm" | "embedding" | "image" | "speech";
  provider: string;
  description: string;
  usedBy: string[];
}

export interface SharedService {
  id: string;
  name: string;
  type: "server" | "worker" | "agent" | "webhook";
  tech: string;
  description: string;
  endpoints?: ExternalEndpoint[];
  repo?: string;
}

// === Screen States (page-level state previews) ===

export interface ScreenState {
  id: string; // "connected", "session-phase"
  name: string; // "Connected State", "Live Session"
  description: string; // What this state represents
  isInitial?: boolean; // Auto-applied on page load
  triggeredBy?: string[]; // Action labels that produce this state
  mutations: DomMutation[]; // Ordered DOM changes
  elementDescriptions?: Record<string, string>; // "Health Score" → "Shows '—'"
}

export interface DomMutation {
  selector?: string; // CSS selector
  textMatch?: string; // Find by visible text
  closest?: string; // Walk up from textMatch to this selector
  op: DomMutationOp;
}

export type DomMutationOp =
  | { type: "hide" }
  | { type: "show" }
  | { type: "setText"; value: string }
  | { type: "setHtml"; value: string }
  | { type: "addClass"; classes: string }
  | { type: "removeClass"; classes: string }
  | { type: "setStyle"; styles: Record<string, string> };

// === Flows (top-level user journeys) ===

export interface PlanFlow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  priority: "critical" | "high" | "medium" | "low";
  module: string;
  steps: PlanFlowStep[];
  outcome: string;
  tags?: string[];
}

export interface PlanFlowStep {
  order: number;
  layer:
    | "ui"
    | "api"
    | "server"
    | "db"
    | "middleware"
    | "external"
    | "blockchain"
    | "ai"
    | "contract";
  action: string;
  screen?: string;
  endpoint?: string;
  contract?: string;
  service?: string;
  pipelineRef?: string; // pipeline ID to link to a pipeline result
  expectedResult?: string;
  checks?: string[];
}

// === Visualization Types (computed from registry) ===

export interface ModulePlanSummary {
  moduleId: string;
  moduleName: string;
  icon: string;
  color: string;
  screenCount: number;
  endpointCount: number;
  tableCount: number;
  implementedScreens: number;
  plannedScreens: number;
  testCount: number;
}

export type PlanItemType = "screen" | "endpoint" | "table" | "flow";

export interface PlanTreeItem {
  id: string;
  type: PlanItemType;
  name: string;
  moduleId: string;
  moduleName: string;
  moduleColor: string;
}

// === Utility functions ===

export function getModuleSummaries(plan: PlanRegistry): ModulePlanSummary[] {
  return plan.modules.map((mod) => ({
    moduleId: mod.id,
    moduleName: mod.name,
    icon: mod.icon,
    color: mod.color,
    screenCount: mod.screens.length,
    endpointCount: mod.apiEndpoints.length,
    tableCount: mod.dbTables.length,
    implementedScreens: mod.screens.filter((s) => s.status === "implemented")
      .length,
    plannedScreens: mod.screens.filter((s) => s.status === "planned").length,
    testCount: mod.screens.reduce((sum, s) => sum + (s.tests?.length ?? 0), 0),
  }));
}

export function getScreensByModule(
  plan: PlanRegistry,
  moduleId: string,
): PlanScreen[] {
  const mod = plan.modules.find((m) => m.id === moduleId);
  return mod?.screens ?? [];
}

export function getEndpointsByModule(
  plan: PlanRegistry,
  moduleId: string,
): PlanEndpoint[] {
  const mod = plan.modules.find((m) => m.id === moduleId);
  return mod?.apiEndpoints ?? [];
}

export function getTablesByModule(
  plan: PlanRegistry,
  moduleId: string,
): PlanTable[] {
  const mod = plan.modules.find((m) => m.id === moduleId);
  return mod?.dbTables ?? [];
}

export function getFlowSteps(
  plan: PlanRegistry,
  flowId: string,
): PlanFlowStep[] {
  const flow = plan.flows.find((f) => f.id === flowId);
  return flow?.steps ?? [];
}

export function findScreenById(
  plan: PlanRegistry,
  screenId: string,
): PlanScreen | null {
  for (const mod of plan.modules) {
    const screen = mod.screens.find((s) => s.id === screenId);
    if (screen) return screen;
  }
  return null;
}

export function findEndpointById(
  plan: PlanRegistry,
  endpointId: string,
): PlanEndpoint | null {
  for (const mod of plan.modules) {
    const endpoint = mod.apiEndpoints.find((e) => e.id === endpointId);
    if (endpoint) return endpoint;
  }
  return null;
}

export function findTableById(
  plan: PlanRegistry,
  tableId: string,
): PlanTable | null {
  for (const mod of plan.modules) {
    const table = mod.dbTables.find((t) => t.id === tableId);
    if (table) return table;
  }
  return null;
}

export function getAllItems(plan: PlanRegistry): PlanTreeItem[] {
  const items: PlanTreeItem[] = [];

  for (const mod of plan.modules) {
    for (const screen of mod.screens) {
      items.push({
        id: screen.id,
        type: "screen",
        name: screen.name,
        moduleId: mod.id,
        moduleName: mod.name,
        moduleColor: mod.color,
      });
    }
    for (const endpoint of mod.apiEndpoints) {
      items.push({
        id: endpoint.id,
        type: "endpoint",
        name: `${endpoint.method} ${endpoint.path}`,
        moduleId: mod.id,
        moduleName: mod.name,
        moduleColor: mod.color,
      });
    }
    for (const table of mod.dbTables) {
      items.push({
        id: table.id,
        type: "table",
        name: table.name,
        moduleId: mod.id,
        moduleName: mod.name,
        moduleColor: mod.color,
      });
    }
  }

  for (const flow of plan.flows) {
    items.push({
      id: flow.id,
      type: "flow",
      name: flow.name,
      moduleId: flow.module || "",
      moduleName: flow.module
        ? (plan.modules.find((m) => m.id === flow.module)?.name ?? "Flows")
        : "Flows",
      moduleColor: flow.module
        ? (plan.modules.find((m) => m.id === flow.module)?.color ?? "#8b5cf6")
        : "#8b5cf6",
    });
  }

  return items;
}

export function getTotalStats(plan: PlanRegistry) {
  let screens = 0;
  let endpoints = 0;
  let tables = 0;
  let implemented = 0;
  let planned = 0;
  let tests = 0;

  for (const mod of plan.modules) {
    screens += mod.screens.length;
    endpoints += mod.apiEndpoints.length;
    tables += mod.dbTables.length;
    implemented += mod.screens.filter((s) => s.status === "implemented").length;
    planned += mod.screens.filter((s) => s.status === "planned").length;
    tests += mod.screens.reduce((sum, s) => sum + (s.tests?.length ?? 0), 0);
  }

  return {
    modules: plan.modules.length,
    screens,
    endpoints,
    tables,
    flows: plan.flows.length,
    implemented,
    planned,
    tests,
  };
}

// === Dependency Graph ===

export function getScreenDependencyGraph(
  plan: PlanRegistry,
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const mod of plan.modules) {
    for (const screen of mod.screens) {
      graph.set(screen.id, screen.dependsOn ?? []);
    }
  }
  return graph;
}

export function getExecutionOrder(plan: PlanRegistry): string[] {
  const graph = getScreenDependencyGraph(plan);
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const deps = graph.get(id) ?? [];
    for (const dep of deps) visit(dep);
    order.push(id);
  }

  for (const key of graph.keys()) visit(key);
  return order;
}
