"use client";

import { clientListResponseSchema, clientContracts, interventionContracts, interventionListResponseSchema } from "@acme/shared";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import { createAuthedApi } from "../../lib/api";
import { getAccessToken } from "../../lib/session-client";

interface SearchResult {
  href: string;
  label: string;
  meta: string;
}

type ClientItem = z.infer<typeof clientListResponseSchema>["items"][number];
type InterventionItem = z.infer<typeof interventionListResponseSchema>["items"][number];

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const api = createAuthedApi(getAccessToken);
      try {
        const [clients, interventions] = await Promise.all([
          api.request(clientContracts.list, {
            query: { page: 1, pageSize: 5, sortBy: "createdAt", sortOrder: "desc", search: query },
          }),
          api.request(interventionContracts.list, {
            query: { page: 1, pageSize: 5, sortBy: "scheduledAt", sortOrder: "asc", search: query },
          }),
        ]);

        setResults([
          ...clients.items.map((client: ClientItem) => ({
            href: "/clients",
            label: client.name,
            meta: client.email ?? "Client",
          })),
          ...interventions.items.map((item: InterventionItem) => ({
            href: `/interventions/${item.id}`,
            label: item.title,
            meta: item.status,
          })),
        ]);
      } catch {
        setResults([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <Search className="h-4 w-4" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clients and interventions..."
          className="w-full bg-transparent outline-none placeholder:text-slate-400"
        />
      </div>
      {open && results.length > 0 ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.12)]">
          {results.map((result, index) => (
            <Link
              key={`${result.href}-${result.label}-${index}`}
              href={result.href}
              className="block border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
            >
              <p className="text-sm font-medium text-slate-900">{result.label}</p>
              <p className="text-xs text-slate-500">{result.meta}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
