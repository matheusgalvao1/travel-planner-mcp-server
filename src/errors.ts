/**
 * Single error type for the whole server so the MCP layer can turn any failure
 * into a clean, machine-readable tool response (status + code + message).
 */
export type ErrorCode =
  | "missing_credentials"
  | "bad_request"
  | "supplier_error"
  | "timeout"
  | "unknown";

export class TravelMcpError extends Error {
  readonly code: ErrorCode;
  readonly status?: number;
  readonly supplier?: string;

  constructor(
    code: ErrorCode,
    message: string,
    options: { status?: number; supplier?: string } = {}
  ) {
    super(message);
    this.name = "TravelMcpError";
    this.code = code;
    this.status = options.status;
    this.supplier = options.supplier;
  }
}

export function toErrorPayload(error: unknown): {
  code: ErrorCode;
  message: string;
  status?: number;
} {
  if (error instanceof TravelMcpError) {
    return { code: error.code, message: error.message, status: error.status };
  }
  return {
    code: "unknown",
    message: error instanceof Error ? error.message : String(error)
  };
}
