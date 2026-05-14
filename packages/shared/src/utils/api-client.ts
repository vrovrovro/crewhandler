import { z } from "zod";
import type { ApiContract } from "../contracts/http";

type InferSchema<TSchema> = TSchema extends z.ZodTypeAny ? z.infer<TSchema> : never;

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
}

export const createApiClient = ({ baseUrl, getAccessToken }: ApiClientOptions) => {
  const request = async <TContract extends ApiContract<any, any>>(
    contract: TContract,
    options?: {
      pathParams?: Record<string, string>;
      query?: InferSchema<TContract["query"]>;
      body?: InferSchema<TContract["body"]>;
    },
  ): Promise<InferSchema<TContract["response"]>> => {
    const resolvedPath = Object.entries(options?.pathParams ?? {}).reduce(
      (path, [key, value]) => path.replace(`:${key}`, value),
      contract.path,
    );

    const url = new URL(resolvedPath, baseUrl);
    if (options?.query) {
      Object.entries(options.query as Record<string, string | number | undefined>).forEach(
        ([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
          }
        },
      );
    }

    const accessToken = (await getAccessToken?.()) ?? null;
    const hasBody = options?.body !== undefined;

    const response = await fetch(url.toString(), {
      method: contract.method,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(contract.auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return contract.response.parse(data);
  };

  return { request };
};
