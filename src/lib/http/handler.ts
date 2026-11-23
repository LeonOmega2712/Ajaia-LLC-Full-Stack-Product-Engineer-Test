import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler so domain errors become consistent JSON responses. */
export function withErrors<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json({ error: err.message, ...err.details }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
