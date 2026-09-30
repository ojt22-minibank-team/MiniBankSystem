// Pagination helper types (kept for future use)
export interface PaginationParams {
  page: number;
  size: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
