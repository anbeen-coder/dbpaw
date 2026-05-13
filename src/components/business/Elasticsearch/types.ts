import type {
  ElasticsearchIndexInfo,
  ElasticsearchSearchHit,
} from "@/services/api";

export interface ElasticsearchField {
  name: string;
  type?: string;
  path?: string;
}

export type ElasticsearchSortField = "_score" | "_id" | string;
export type ElasticsearchSortDirection = "asc" | "desc";

export interface ElasticsearchSort {
  field: ElasticsearchSortField;
  direction: ElasticsearchSortDirection;
}

export interface ElasticsearchViewState {
  query: string;
  dsl: string;
  from: number;
  pageSize: number;
  hits: ElasticsearchSearchHit[];
  total: number;
  tookMs: number;
  aggregations?: unknown;
  selectedHit: ElasticsearchSearchHit | null;
  detailMode: ElasticsearchDetailMode;
  fields: ElasticsearchField[];
  showFieldList: boolean;
  showDocumentDetail: boolean;
  sort: ElasticsearchSort;
  visibleColumns: string[];
}

export type ElasticsearchDetailMode =
  | "document"
  | "mapping"
  | "aggregations"
  | "console";

export interface ElasticsearchDocumentDetailProps {
  hit: ElasticsearchSearchHit | null;
  mapping: unknown;
  aggregations?: unknown;
  index: string;
  connectionId: number;
  detailMode: ElasticsearchDetailMode;
  onDetailModeChange: (mode: ElasticsearchDetailMode) => void;
  onDocumentSave: (docId: string, source: string) => Promise<void>;
  onDocumentDelete: (docId: string) => Promise<void>;
  onCopy: () => void;
}

export interface ElasticsearchDocumentTableProps {
  hits: ElasticsearchSearchHit[];
  total: number;
  from: number;
  pageSize: number;
  isLoading: boolean;
  selectedHit: ElasticsearchSearchHit | null;
  sort: ElasticsearchSort;
  visibleColumns: string[];
  onHitSelect: (hit: ElasticsearchSearchHit) => void;
  onPageChange: (from: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (sort: ElasticsearchSort) => void;
  onColumnsChange: (columns: string[]) => void;
}

export interface ElasticsearchFieldListProps {
  fields: ElasticsearchField[];
  selectedField: string | null;
  isLoading: boolean;
  visibleColumns: string[];
  onFieldSelect: (fieldName: string) => void;
  onFieldToggle: (fieldName: string) => void;
}

export interface ElasticsearchSearchBarProps {
  index: string;
  currentIndex?: ElasticsearchIndexInfo;
  total: number;
  tookMs: number;
  query: string;
  dsl: string;
  isSearching: boolean;
  isManagingIndex: boolean;
  isBulkImporting: boolean;
  isBulkExporting: boolean;
  showFieldList: boolean;
  showDocumentDetail: boolean;
  onQueryChange: (query: string) => void;
  onDslChange: (dsl: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onImport: () => void;
  onExport: () => void;
  onManageIndex: (
    action: import("./elasticsearch-index-management").ElasticsearchIndexAction,
  ) => void;
  onToggleFieldList: () => void;
  onToggleDocumentDetail: () => void;
}
