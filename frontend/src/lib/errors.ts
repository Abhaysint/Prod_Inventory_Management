import axios from "axios";

export interface NormalizedError {
  message: string;
  fieldErrors: Record<string, string>;
  status?: number;
}

interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export function normalizeApiError(error: unknown): NormalizedError {
  const result: NormalizedError = {
    message: "An unexpected error occurred.",
    fieldErrors: {},
  };

  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      result.message = error.message;
    }
    return result;
  }

  result.status = error.response?.status;

  if (!error.response) {
    result.message = "Network error. Unable to reach server. Please check your connection.";
    return result;
  }

  const data = error.response.data as { detail?: unknown } | undefined;

  if (!data || !data.detail) {
    if (result.status === 404) {
      result.message = "Resource not found.";
    } else if (result.status === 403) {
      result.message = "You don't have permission to perform this action.";
    } else if (result.status === 401) {
      result.message = "Session expired or invalid credentials.";
    } else if (result.status && result.status >= 500) {
      result.message = "Internal server error. Please try again later.";
    } else {
      result.message = error.message || "Request failed.";
    }
    return result;
  }

  // Case 1: detail is a string (HTTPException e.g. 400, 401, 403, 404, 409)
  if (typeof data.detail === "string") {
    result.message = data.detail;
    return result;
  }

  // Case 2: detail is an array of validation errors (422 Unprocessable Entity)
  if (Array.isArray(data.detail)) {
    const validationErrors = data.detail as ValidationErrorItem[];
    const messages: string[] = [];

    for (const item of validationErrors) {
      if (item && item.loc && item.loc.length > 0) {
        // Last element of loc is usually the field name (e.g. ['body', 'sku'] -> 'sku')
        const field = String(item.loc[item.loc.length - 1]);
        result.fieldErrors[field] = item.msg;
        messages.push(`${field}: ${item.msg}`);
      } else if (item && item.msg) {
        messages.push(item.msg);
      }
    }

    result.message =
      messages.length > 0
        ? messages.join("; ")
        : "Validation failed. Please check the entered data.";
    return result;
  }

  return result;
}
