import type { ZodTypeAny } from "zod";

export interface ApiContract<
  TMethod extends "GET" | "POST" | "PATCH" | "DELETE",
  TPath extends string,
> {
  method: TMethod;
  path: TPath;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
  response: ZodTypeAny;
  auth?: boolean;
}

export const defineContract = <
  TMethod extends "GET" | "POST" | "PATCH" | "DELETE",
  TPath extends string,
>(
  contract: ApiContract<TMethod, TPath>,
) => contract;
