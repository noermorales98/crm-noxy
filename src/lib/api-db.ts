import { NextResponse } from "next/server";
import { dbUnavailableUserMessage, isDbUnavailableError } from "@/src/lib/db-errors";

/** Map DB outages to HTTP 503 so the CRM UI can degrade instead of hard-failing. */
export function jsonFromUnknownError(error: unknown, fallbackMessage = "Error interno") {
  if (isDbUnavailableError(error)) {
    return NextResponse.json(
      {
        error: dbUnavailableUserMessage(error),
        code: "DB_UNAVAILABLE",
        retryable: true,
      },
      { status: 503 },
    );
  }

  console.error(error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
