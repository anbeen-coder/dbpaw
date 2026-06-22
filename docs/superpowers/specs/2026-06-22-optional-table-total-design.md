# Optional Table Total Design

## Problem

Opening a large table currently runs a total-count query before the user can
inspect the first page. For large databases this makes the table viewer feel
stuck, even when the user only needs schema information and a small data sample.

## Goals

- Open table tabs without calculating total row count by default.
- Preserve fast access to the first page of data and table structure.
- Let users explicitly calculate total count when they need exact pagination.
- Keep existing export and transfer flows that depend on full-table iteration
  from silently changing behavior.

## Non-Goals

- No estimated row counts in this change.
- No driver-specific optimizer work beyond skipping the count query.
- No changes to SQL editor query result row counts.

## Architecture

`TableDataResponse.total` becomes nullable across Rust and TypeScript. A null
total means "not calculated", not zero.

The table-data command accepts an optional `includeTotal` flag. The default is
false for UI table browsing. When false, drivers execute only the paged data
query. When true, drivers keep the existing count behavior and return the exact
total.

Driver internals receive the total-count preference through the existing
`get_table_data` path. `get_table_data_chunk` and export/transfer paths keep
exact totals where their callers depend on full-table progress.

## Frontend Behavior

Table tabs default to `includeTotal: false`.

The data grid treats `total === null` as unknown pagination:

- Page text shows an unknown total-page state.
- Previous page remains disabled on page 1.
- Next page is enabled when the current page contains `pageSize` rows.
- Next page is disabled when the current page contains fewer than `pageSize`
  rows.

The toolbar adds a compact "total" toggle. Turning it on refreshes the current
page with `includeTotal: true`. Turning it off refreshes without total count.
The tab stores this preference so refresh, pagination, sorting, and filtering
stay consistent for that tab.

## Error Handling

Skipping total count should not hide errors from the data query. If the paged
data query fails, existing structured `AppError` handling is unchanged.

If exact total count is enabled and the count query fails, the table-data request
fails as it does today. The user can turn the toggle off to browse without the
count query.

## Testing

- Unit-test frontend pagination behavior when total is null.
- Unit-test API/mock typing for nullable totals.
- Add Rust tests around at least one lightweight driver path to confirm
  `include_total = false` skips count and returns `None`.
- After modifying Rust files, run `cargo check`.

