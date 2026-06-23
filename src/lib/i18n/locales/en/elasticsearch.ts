export const elasticsearch = {
  fields: {
    title: "Fields",
    search: "Search fields...",
    noFields: "No fields found",
  },
  documents: {
    title: "Documents",
    page: "Page",
    of: "of",
    hits: "hits",
    limit: "Limit",
    sort: "Sort",
    noDocuments: "No documents",
    showing: "Showing {{from}}-{{to}} of {{total}}",
  },
  detail: {
    document: "Document",
    mapping: "Mapping",
    aggregations: "Aggregations",
    console: "Console",
    documentId: "Document ID",
    open: "Open",
    new: "New",
    save: "Save",
    delete: "Delete",
    copy: "Copy",
    send: "Send",
    noAggregations: "No aggregations",
    autoGenerateId: "Leave blank to auto-generate ID",
  },
  actions: {
    refresh: "Refresh",
    import: "Import NDJSON",
    export: "Export NDJSON",
    openIndex: "Open index",
    closeIndex: "Close index",
    deleteIndex: "Delete index",
    moreActions: "More actions",
  },
  search: {
    placeholder: "query_string, e.g. status:200 AND user:kimchy",
    dslPlaceholder: 'Optional JSON DSL, e.g. {"query":{"match_all":{}}}',
    search: "Search",
  },
  console: {
    method: "Method",
    path: "Path",
    body: "Request Body",
    response: "Response",
    placeholder: "Optional JSON request body",
  },
} as const;

export const erDiagram = {
  title: "ER Diagram",
  noForeignKeys: "No foreign key relationships found",
  loading: "Loading ER diagram...",
} as const;
