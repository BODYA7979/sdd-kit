/** INV-01 success envelope. Mirrors JsonResponseTrait::resource() in the API. */
export interface ApiEnvelope<T> {
  success: true;
  status: number;
  message: string;
  data: T;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

/** Mirrors JsonResponseTrait::paginated(). Some lists add keys to meta (e.g. reviews). */
export interface PaginatedEnvelope<T, M extends PaginationMeta = PaginationMeta> {
  success: true;
  status: number;
  message: string;
  data: T[];
  meta: M;
}

/** INV-01 error envelope, rendered in api/bootstrap/app.php. */
export interface ApiErrorBody {
  success: false;
  status: number;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}
