# Pipeline Connection Indicators in /dev/plan

## Goal
Add `pipelineRef` field to UIActions so the `/dev/plan` inspect mode shows a distinct border color for actions that are annotated with a pipeline connection (contract call, API route, CRE workflow). This lets the user visually scan which buttons/actions are ready for `/x2` integration.

## Architecture

The pipeline ref is **metadata only** — it does NOT write integration code. It flows through:

```
plan JSON (UIAction.pipelineRef)
  → match-actions.ts (passes through to ElementMatch)
    → overlay-bridge.ts (sends to iframe via actionColorMap)
      → overlay-inject.ts (renders distinct border color)
        → HoverSidebar (shows pipeline ref in sidebar)
```

## Changes (7 files)

### 1. `frontend/src/lib/plan-registry.ts:344-360` — Add `pipelineRef` to `UIAction`

Add optional `pipelineRef` field to the `UIAction` interface:
```typescript
export interface UIAction {
  label: string;
  icon?: string;
  variant?: "primary" | "outline" | "ghost" | "destructive" | "secondary";
  action: "navigate" | "dialog" | "submit" | "api-call" | "confirm-delete" | "download" | "toggle";
  target?: string;
  endpoint?: string;
  condition?: UICondition;
  description?: string;
  pipelineRef?: string; // e.g. "contracts:KosynUSD.transfer", "api:/api/records", "cre:data-marketplace"
}
```

### 2. `frontend/src/lib/dev-overlay/types.ts:52-64` — Add `pipelineRef` to `ElementMatch`

```typescript
export interface ElementMatch {
  matched: true;
  label: string;
  actionType: string;
  description?: string;
  target?: string;
  endpoint?: string;
  pipelineRef?: string;  // NEW
  context: string;
  flows: FlowSummary[];
  scenarios: ScenarioState[];
  pageStates: PageStateSummary[];
  transitionsTo?: string;
}
```

### 3. `frontend/src/lib/dev-overlay/match-actions.ts:177-188` — Pass `pipelineRef` through

In the `matchElement` return block, add:
```typescript
pipelineRef: match.action.pipelineRef,
```

### 4. `frontend/src/lib/dev-overlay/overlay-bridge.ts` — Two changes

**4a. `setInspectMode` (~line 88):** Change `actionColorMap` value from just `actionType` to include pipeline flag:
```typescript
actionColorMap[entry.action.label] = entry.action.pipelineRef
  ? "pipeline:" + (entry.action.action || "navigate")
  : entry.action.action || "navigate";
```

**4b. `HoverInteractiveData` (~line 15):** Add `pipelineRef` field:
```typescript
export interface HoverInteractiveData {
  type: "interactive";
  matched: true;
  label: string;
  actionType: string;
  pipelineRef?: string;  // NEW
  // ... rest unchanged
}
```

**4c. Hover handler (~line 234):** Pass pipelineRef through:
```typescript
pipelineRef: response.pipelineRef,
```

### 5. `frontend/src/lib/dev-overlay/overlay-inject.ts` — Add pipeline color

**5a. `INSPECT_COLORS` (~line 448):** Add pipeline-connected color (cyan-ish, distinct from all existing):
```javascript
var INSPECT_COLORS = {
  navigate: 'rgba(34,197,94,0.8)',
  // ... existing colors
  pipeline: 'rgba(14,165,233,0.9)',  // sky-500 — bright, distinct from all others
  unmatched: 'rgba(161,161,170,0.5)',
};
```

**5b. `matchActionColor` (~line 463):** Handle `pipeline:` prefix in actionType:
```javascript
function matchActionColor(text, colorMap) {
  // ... existing matching logic
  var actionType = colorMap[keys[i]];
  // Check for pipeline prefix
  if (actionType && actionType.indexOf('pipeline:') === 0) {
    return { color: INSPECT_COLORS.pipeline, type: 'pipeline' };
  }
  return { color: INSPECT_COLORS[actionType] || INSPECT_COLORS.unmatched, type: actionType };
}
```

**5c. Border rendering (~line 499):** Pipeline-connected elements get a **double border** (3px solid) instead of the normal 2px, making them visually pop:
```javascript
var borderStyle = match.type === 'unmatched' ? '2px dashed ' + match.color
  : match.type === 'pipeline' ? '3px solid ' + match.color
  : '2px solid ' + match.color;
```

### 6. `frontend/src/components/dev/plan-viewer/ScreenDetail.tsx` — Sidebar + legend updates

**6a. `INSPECT_LEGEND_ITEMS` (~line 660):** Add pipeline entry:
```typescript
{ label: 'Pipeline', color: 'rgba(14,165,233,0.9)', border: 'solid' },
```

**6b. `HoverSidebar` matched section (~line 568):** When `data.pipelineRef` exists, show a pipeline connection badge below the action type:
```tsx
{data.pipelineRef && (
  <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-sky-500/10 border border-sky-500/20">
    <Link2 className="h-3 w-3 text-sky-400" />
    <span className="text-xs text-sky-400 font-mono">{data.pipelineRef}</span>
  </div>
)}
```

### 7. `/x4` skill update — Document `pipelineRef` usage

Update the `/x4` SKILL.md to instruct the agent to add `pipelineRef` annotations when mapping actions that connect to pipeline items. Format: `"category:target"` where category is `contracts`, `api`, `cre`, or `external`.

## Color System Summary

| Border | Meaning |
|--------|---------|
| Green 2px solid | Navigate |
| Blue 2px solid | Submit / API call |
| Purple 2px solid | Dialog |
| Amber 2px solid | Toggle |
| Red 2px solid | Delete |
| Cyan 1px solid | Notable (text element) |
| **Sky 3px solid** | **Pipeline-connected (NEW)** |
| Gray 2px dashed | Unmatched |

Pipeline color takes **precedence** over action-type color. A "navigate" action with a `pipelineRef` shows as sky/pipeline, not green/navigate. This is intentional — the user wants to see "which elements are wired to the pipeline" as the primary signal.

## Testing Plan

1. TypeScript compilation (`tsc --noEmit`) — must pass
2. Next.js build (`npm run build`) — must pass
3. Manual verification:
   - Add a test `pipelineRef` to one action in a module JSON
   - Open `/dev/plan`, navigate to that screen
   - Enter inspect mode → confirm sky-blue 3px border on the annotated element
   - Hover the element → confirm sidebar shows pipeline ref badge
   - Legend shows "Pipeline" entry
   - Non-pipeline elements still show their normal colors
4. Remove test annotation after verification
