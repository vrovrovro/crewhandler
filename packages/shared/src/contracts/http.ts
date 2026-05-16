import type { ZodTypeAny } from "zod";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type BaseContract<
  TMethod extends HttpMethod,
  TPath extends string,
  TResponse extends ZodTypeAny,
> = {
  method: TMethod;
  path: TPath;
  response: TResponse;
  auth?: boolean;
};

export type ApiContract<
  TMethod extends HttpMethod,
  TPath extends string,
  TResponse extends ZodTypeAny = ZodTypeAny,
> = BaseContract<TMethod, TPath, TResponse> & {
  query?: ZodTypeAny;
  body?: ZodTypeAny;
};

export const defineContract = <
  TMethod extends HttpMethod,
  TPath extends string,
  TResponse extends ZodTypeAny,
  TContract extends BaseContract<TMethod, TPath, TResponse>,
>(
  contract: TContract,
) => contract;