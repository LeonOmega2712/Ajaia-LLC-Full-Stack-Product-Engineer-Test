import { NextResponse } from "next/server";
import { AppError, ValidationError } from "@/lib/errors";

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler so domain errors become consistent JSON responses. */
export function withErrors<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        // `details` stays nested so a payload key can never overwrite the message.
        const body = err.details ? { error: err.message, details: err.details } : { error: err.message };
        return NextResponse.json(body, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

/** Parses a JSON body. An empty body counts as `{}`; malformed JSON is a 400, never silently ignored. */
export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
}
