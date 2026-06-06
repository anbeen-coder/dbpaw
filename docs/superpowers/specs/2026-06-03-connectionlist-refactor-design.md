# ConnectionList.tsx Refactor Design

## Problem

`src/components/business/Sidebar/ConnectionList.tsx` is 4,417 lines with 57 `useState` calls and 20 distinct responsibilities. It is a "god component" that mixes connection CRUD, tree expansion state, data fetching, import/export, create database dialog, Redis key scanning, and more into a single file. This makes it hard to understand, maintain, and test.

## Scope

Refactor `ConnectionList.tsx` only. `App.tsx` (2,521 lines) is out of scope for this iteration.

## Approach

Extract responsibilities into custom hooks following the existing `connection-list/` extraction pattern. ConnectionList.tsx becomes an orchestration layer that calls hooks and renders JSX.

## File Structure

```
src/components/business/Sidebar/
├── ConnectionList.tsx              # Orchestration layer (~1500 lines)
├── connection-list/
│   ├── ConnectionDialog.tsx        # Existing
│   ├── TreeNode.tsx                # Existing
│   ├── helpers.tsx                 # Existing
│   ├── CreateDatabaseDialog.tsx    # NEW: create database dialog
│   ├── ExportDialogs.tsx           # NEW: database + table export dialogs
│   └── ImportConfirmDialog.tsx     # NEW: import confirmation dialog
├── hooks/
│   ├── useConnectionForm.ts        # Connection form state management
│   ├── useConnectionCrud.ts        # Connection CRUD operations
│   ├── useTreeExpansion.ts         # Tree expansion state
│   ├── useTreeDataFetching.ts      # Data lazy-loading
│   ├── useCreateDatabase.ts        # Create database logic
│   ├── useImportExport.ts          # Import/export logic
│   └── useRedisKeys.ts             # Redis key scanning
```

## Hook Interfaces

### useConnectionForm

Manages the create/edit connection dialog form state, validation, and test connection flow.

```typescript
function useConnectionForm(opts: {
  onConnectionCreated: (conn: SavedConnection) => void;
  onConnectionUpdated: (conn: SavedConnection) => void;
}): {
  form: ConnectionForm;
  setForm: Dispatch<SetStateAction<ConnectionForm>>;
  dialogMode: "create" | "edit";
  createStep: "type" | "details";
  isDialogOpen: boolean;
  editingConnectionId: string | null;
  isConnecting: boolean;
  isSavingEdit: boolean;
  isTesting: boolean;
  validationMsg: string | null;
  testMsg: { ok: boolean; text: string; latency?: number } | null;
  normalizedForm: ConnectionForm;
  validationIssues: string[];
  requiredOk: boolean;
  openCreateDialog: () => void;
  openEditDialog: (connectionId: string, connection: Connection) => void;
  closeDialog: () => void;
  handleCreateDriverSelect: (driver: Driver) => void;
  handleSubmit: (e: FormEvent) => void;
  handleConnect: () => Promise<void>;
  handleSaveEdit: () => Promise<void>;
  handleTestConnection: () => Promise<void>;
  resetFeedback: () => void;
  pickSslCaCertFile: () => Promise<void>;
  pickSshKeyFile: () => Promise<void>;
  pickDatabaseFile: (driver: Driver) => Promise<void>;
};
```

Extracts: ~400 lines (state, callbacks, effects, validation helpers).

### useConnectionCrud

Manages the connection list, loading, connect/disconnect, duplicate, delete, reconnect.

```typescript
function useConnectionCrud(): {
  connections: Connection[];
  setConnections: Dispatch<SetStateAction<Connection[]>>;
  isLoadingConnections: boolean;
  fetchConnections: () => Promise<void>;
  connectConnection: (connectionId: string, opts?: { databaseName?: string }) => Promise<void>;
  deleteConnection: (connectionId: string) => Promise<void>;
  duplicateConnection: (connectionId: string) => Promise<string | null>;
  reconnect: (connectionId: string) => Promise<void>;
  clearTreeCache: (connectionId: string) => void;
};
```

Extracts: ~300 lines.

### useTreeExpansion

Manages expansion state for all tree node types (connections, databases, schemas, tables, groups, query groups).

```typescript
function useTreeExpansion(): {
  expandedConnections: Set<string>;
  expandedDatabases: Set<string>;
  expandedSchemas: Set<string>;
  expandedTables: Set<string>;
  expandedDatabaseGroups: Set<string>;
  expandedQueryGroups: Set<string>;
  expandedGroupNodes: Set<string>;
  toggleConnection: (id: string) => void;
  toggleDatabase: (key: string) => void;
  toggleSchema: (key: string) => void;
  toggleTable: (key: string) => void;
  toggleDatabaseGroup: (key: string) => void;
  toggleQueryGroup: (key: string) => void;
  toggleGroupNode: (key: string) => void;
  expandAncestors: (connectionId: string, database: string, schema?: string) => void;
  collapseConnection: (connectionId: string) => void;
};
```

Extracts: ~200 lines (7 useState + 7 toggle functions + expand/collapse helpers).

### useTreeDataFetching

Lazy-loads tree children: tables, columns, routines, events, sequences, types, synonyms, packages.

```typescript
function useTreeDataFetching(expansion: ReturnType<typeof useTreeExpansion>): {
  loadingDatabaseKeys: Set<string>;
  loadingTableKeys: Set<string>;
  databaseEvents: Map<string, EventInfo[]>;
  databaseSequences: Map<string, SequenceInfo[]>;
  databaseTypes: Map<string, TypeInfo[]>;
  databaseSynonyms: Map<string, SynonymInfo[]>;
  databasePackages: Map<string, PackageInfo[]>;
  fetchTables: (connectionId: string, databaseName: string, driver: Driver, opts?: {...}) => Promise<void>;
  fetchColumns: (connectionId: string, databaseName: string, schema: string, tableName: string, driver: Driver) => Promise<void>;
  refreshDatabase: (connectionId: string, databaseName: string, driver: Driver) => Promise<void>;
};
```

Extracts: ~500 lines (6 useState + 10 fetch functions + effects).

### useCreateDatabase

Manages the create database dialog: form state, MySQL charset/collation fetching, validation, API call.

```typescript
function useCreateDatabase(connections: Connection[]): {
  isOpen: boolean;
  connectionId: string | null;
  form: CreateDatabaseForm;
  showAdvanced: boolean;
  validationMsg: string | null;
  isCreating: boolean;
  mysqlCharsets: string[];
  mysqlCollations: string[];
  loadingMysqlOptions: boolean;
  targetConnection: Connection | undefined;
  openDialog: (connectionId: string) => void;
  closeDialog: () => void;
  setForm: Dispatch<SetStateAction<CreateDatabaseForm>>;
  setShowAdvanced: Dispatch<SetStateAction<boolean>>;
  handleCreate: () => Promise<void>;
};
```

Extracts: ~400 lines (10 useState + 3 useEffect + constants + handlers).

### useImportExport

Manages SQL import, database export, and table export flows.

```typescript
function useImportExport(connections: Connection[]): {
  // Import
  pendingImport: PendingImport | null;
  isImportConfirmOpen: boolean;
  isImporting: boolean;
  handleDatabaseImport: (connectionId: string, databaseName: string, driver: Driver) => void;
  confirmImport: () => Promise<void>;
  cancelImport: () => void;
  // Database export
  pendingDatabaseExport: PendingDatabaseExport | null;
  isDatabaseExportDialogOpen: boolean;
  isExportingDatabase: boolean;
  handleDatabaseExport: (connection: Connection, database: string) => void;
  confirmDatabaseExport: () => Promise<void>;
  // Table export
  pendingTableExport: PendingTableExport | null;
  isTableExportDialogOpen: boolean;
  isExportingTable: boolean;
  tableExportFormat: TableExportFormat;
  setTableExportFormat: Dispatch<SetStateAction<TableExportFormat>>;
  handleTableExport: (connection: Connection, database: string, table: string) => void;
  confirmTableExport: () => Promise<void>;
};
```

Extracts: ~400 lines (10 useState + 6 handlers).

### useRedisKeys

Redis key scanning with cursor-based pagination.

```typescript
function useRedisKeys(): {
  loadKeysPage: (connectionId: string, databaseName: string, cursor: number, append: boolean, pattern?: string) => Promise<void>;
  keyToTableInfo: (key: string) => TableInfo;
};
```

Extracts: ~100 lines.

## Dependency Graph

```
useTreeExpansion (independent)
    ↓ expansion state
useTreeDataFetching (depends on useTreeExpansion)

useConnectionCrud (independent)
    ↓ connections array
useConnectionForm (depends on callbacks from orchestration)
useCreateDatabase (depends on connections)
useImportExport (depends on connections)

useRedisKeys (independent)
```

## Extracted Dialog Components

### CreateDatabaseDialog

Renders the create database dialog with driver-specific fields (MySQL charset/collation, PostgreSQL encoding/locale, MSSQL collation). Receives `useCreateDatabase` hook return value as props.

### ExportDialogs

Renders database export and table export format selection dialogs. Receives `useImportExport` hook state as props.

### ImportConfirmDialog

Renders the SQL import confirmation dialog. Receives import state from `useImportExport` as props.

## What Stays in ConnectionList.tsx

| Concern | Reason |
|---------|--------|
| Search/filter (`filteredConnections`) | Combines data from multiple hooks |
| Active table highlight + auto-scroll | Tightly coupled to tree rendering |
| DatasourceTreeAdapter assembly | Aggregates methods from all hooks |
| Tree node JSX rendering | Already uses TreeNode component |
| Saved Queries loading | Only 2 state + 1 effect, not worth extracting |
| Elasticsearch/MongoDB toggles | Only 1 state each, not worth extracting |
| Context menu state + overlay | Small, rendering-coupled |

## Testing Strategy

This is a pure refactor (no behavior change). Verification:

1. Existing unit tests pass (`helpers.unit.test.ts`)
2. TypeScript compiles: `npm run typecheck`
3. Lint passes: `npm run lint`
4. Manual smoke test: connect to database, expand tree nodes, create/edit/delete connections, import/export

No new unit tests added. Hook internals are state management + API calls with high mock cost.

## Implementation Order

Dependencies dictate bottom-up order:

1. `useTreeExpansion` (no deps)
2. `useRedisKeys` (no deps)
3. `useConnectionCrud` (no deps)
4. `useTreeDataFetching` (depends on useTreeExpansion)
5. `useConnectionForm` (depends on callbacks)
6. `useCreateDatabase` (depends on connections)
7. `useImportExport` (depends on connections)
8. Extract dialog components (CreateDatabaseDialog, ExportDialogs, ImportConfirmDialog)
9. Refactor ConnectionList.tsx to use hooks + components
10. Verify (typecheck + lint + manual test)

Each step runs `npm run typecheck && npm run lint` to catch regressions.

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| ConnectionList.tsx lines | 4,417 | ~1,500 |
| useState calls in one file | 57 | ~10 |
| Distinct responsibilities | 20 | ~5 |
| New hook files | 0 | 7 |
| New component files | 0 | 3 |
