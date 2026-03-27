import type {
  ListPaginationMeta,
  ListResponse,
  ListResult,
  PaginatedListResponse,
} from "./types";

function isPaginatedListResponse<TItem>(
  data: ListResponse<TItem>,
): data is PaginatedListResponse<TItem> {
  if (Array.isArray(data)) {
    return false;
  }

  return Array.isArray(data.results);
}

export function normalizeListResponse<TItem>(data: ListResponse<TItem>): ListResult<TItem> {
  if (!isPaginatedListResponse(data)) {
    return {
      items: data,
      pagination: null,
    };
  }

  const count = data.count ?? data.results.length;
  const pageSize = data.page_size > 0 ? data.page_size : data.results.length || 1;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const pagination: ListPaginationMeta = {
    count,
    page: data.page > 0 ? data.page : 1,
    pageSize,
    totalPages,
    hasNext: Boolean(data.next),
    hasPrevious: Boolean(data.previous),
  };

  return {
    items: data.results,
    pagination,
  };
}
