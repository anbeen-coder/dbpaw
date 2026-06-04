# RedisStreamViewer Dialog Extraction Design

## Problem

`src/components/business/Redis/value-viewer/RedisStreamViewer.tsx` is 1,837 lines. It contains 4 dialog components that are self-contained and can be extracted.

## Scope

Extract 4 dialog components (~257 lines) from `RedisStreamViewer.tsx` into a `stream/` subdirectory.

## Target File Structure

```
src/components/business/Redis/value-viewer/
├── RedisStreamViewer.tsx          # 1837 → ~1580 行
└── stream/
    └── StreamDialogs.tsx          # 新增 ~260 行
```

## Components to Extract

| Component | Lines | Function |
|-----------|-------|----------|
| `CreateGroupDialog` | ~77 | Create consumer group dialog |
| `ResetGroupDialog` | ~49 | Reset group cursor dialog |
| `TrimDialog` | ~72 | Trim stream dialog |
| `ClaimDialog` | ~52 | Claim entry dialog |

## Component Interfaces

```tsx
// stream/StreamDialogs.tsx

export function CreateGroupDialog(props: {
  onClose: () => void;
  onConfirm: (name: string, startId: string, mkstream: boolean) => void;
}): JSX.Element;

export function ResetGroupDialog(props: {
  groupName: string;
  onClose: () => void;
  onConfirm: (startId: string) => void;
}): JSX.Element;

export function TrimDialog(props: {
  currentLength: number;
  onClose: () => void;
  onConfirm: (strategy: string, threshold: string) => void;
}): JSX.Element;

export function ClaimDialog(props: {
  entry: RedisXPendingEntry;
  onClose: () => void;
  onConfirm: (consumer: string) => void;
}): JSX.Element;
```

## Usage in RedisStreamViewer.tsx

```tsx
import {
  CreateGroupDialog,
  ResetGroupDialog,
  TrimDialog,
  ClaimDialog,
} from "./stream/StreamDialogs";
```

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| RedisStreamViewer.tsx lines | 1,837 | ~1,580 |
| New files | 0 | 1 |

## Verification

1. `npm run typecheck` passes
2. `npm run lint` passes
3. Manual smoke test: open Redis stream key, verify dialogs work
