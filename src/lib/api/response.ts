// ScopeBridge AI — Standardised API response helpers
import { NextResponse } from "next/server";

export function ok<T extends object>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function err(
  message: string,
  status = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}

export function unauthorized(): NextResponse {
  return err("Unauthorized", 401);
}

export function forbidden(): NextResponse {
  return err("Forbidden", 403);
}

export function notFound(resource = "Resource"): NextResponse {
  return err(`${resource} not found`, 404);
}

export function serverError(message = "Internal server error"): NextResponse {
  return err(message, 500);
}
