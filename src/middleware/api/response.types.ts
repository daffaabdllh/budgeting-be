// src/middleware/api/response.types.ts
export interface PaginationMetadata {
  page: number;
  limit: number;
  totalItems?: number;
  totalPages?: number;
  hasNextPage?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface SuccessResponse<T> {
  status: "success";
  data: T;
  message?: string;
  pagination?: PaginationMetadata;
}

export interface ErrorResponse {
  status: "error";
  message: string;
  errors?: ValidationError[] | string[] | string | null;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
