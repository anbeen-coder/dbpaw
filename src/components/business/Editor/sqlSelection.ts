export type SelectionRangeLike = {
  from: number;
  to: number;
};

export interface CollectedSqlExecutionTarget {
  sql: string;
  target: "selection" | "document";
  sourceRange?: { from: number; to: number };
}

export function collectSqlExecutionTarget(params: {
  ranges: readonly SelectionRangeLike[];
  sliceDoc: (from: number, to: number) => string;
  fullDoc: () => string;
}): CollectedSqlExecutionTarget {
  const selectedRanges = params.ranges.filter(
    (range) =>
      range.from !== range.to &&
      params.sliceDoc(range.from, range.to).trim().length > 0,
  );
  if (selectedRanges.length === 0) {
    return { sql: params.fullDoc(), target: "document" };
  }
  return {
    sql: selectedRanges
      .map((range) => params.sliceDoc(range.from, range.to))
      .join("\n"),
    target: "selection",
    sourceRange:
      selectedRanges.length === 1
        ? { from: selectedRanges[0].from, to: selectedRanges[0].to }
        : undefined,
  };
}

export function collectSelectedSql(params: {
  ranges: readonly SelectionRangeLike[];
  sliceDoc: (from: number, to: number) => string;
  fullDoc: () => string;
}): string {
  return collectSqlExecutionTarget(params).sql;
}
