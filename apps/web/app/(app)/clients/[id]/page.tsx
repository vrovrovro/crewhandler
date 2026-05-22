"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientDetailSchema } from "@acme/shared";
import { ArrowLeft, ExternalLink, FileText, MapPin, Phone, UserRound } from "lucide-react";
import { z } from "zod";
import { StateCard } from "../../../../components/feedback/state-card";
import { getClientDetailDirect } from "../../../../lib/supabase-clients";

type ClientDetail = z.infer<typeof clientDetailSchema>;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [data, setData] = useState<ClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (clientId: string) => {
    try {
      const result = await getClientDetailDirect(clientId);
      setData(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load client");
    }
  };

  useEffect(() => {
    if (resolvedParams.id) {
      void load(resolvedParams.id);
    }
  }, [resolvedParams.id]);

  const mapQuery = useMemo(() => encodeURIComponent(data?.client.address ?? ""), [data?.client.address]);
  const mapEmbedUrl = data?.client.address
    ? `https://www.google.com/maps?q=${mapQuery}&output=embed`
    : null;
  const mapOpenUrl = data?.client.address
    ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}`
    : null;

  if (error) {
    return <StateCard title="Unable to load client" description={error} />;
  }

  if (!data) {
    return <StateCard title="Loading client" description="Fetching customer details, related jobs, and invoice history." />;
  }

  const completedJobs = data.interventions.filter((item) => item.status === "COMPLETED").length;
  const openInvoices = data.invoices.filter((item) => item.status !== "PAID" && item.status !== "VOID").length;
  const revenueTotal = data.invoices.reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                  return;
                }
                router.push("/clients");
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to clients
            </button>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Client details</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">{data.client.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
              {data.client.notes ?? "No internal notes saved for this client yet."}
            </p>
          </div>
          <div className="grid w-full max-w-md grid-cols-3 gap-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Jobs</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{data.interventions.length}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Completed</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{completedJobs}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Open invoices</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{openInvoices}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-950">Contact information</h2>
            <dl className="mt-5 grid gap-4">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</dt>
                  <dd className="mt-1 text-sm text-slate-800">{data.client.email ?? "No email on file"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Phone</dt>
                  <dd className="mt-1 text-sm text-slate-800">{data.client.phone ?? "No phone on file"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Address</dt>
                  <dd className="mt-1 text-sm text-slate-800">{data.client.address ?? "No address on file"}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Billing summary</h2>
                <p className="mt-1 text-sm text-slate-500">Revenue and invoice health for this client.</p>
              </div>
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total revenue</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(revenueTotal)}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Invoice count</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{data.invoices.length}</p>
              </article>
            </div>
          </section>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Location</h2>
              <p className="mt-1 text-sm text-slate-500">Map preview for the client address on file.</p>
            </div>
            {mapOpenUrl ? (
              <Link
                href={mapOpenUrl}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Google Maps
              </Link>
            ) : null}
          </div>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
            {mapEmbedUrl ? (
              <iframe
                title={`${data.client.name} map`}
                src={mapEmbedUrl}
                className="h-[340px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex h-[340px] items-center justify-center px-6 text-center text-sm text-slate-500">
                Add an address to this client record and the map preview will appear here.
              </div>
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Related interventions</h2>
              <p className="mt-1 text-sm text-slate-500">Every job that belongs to this client.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {data.interventions.length} total
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {data.interventions.length ? (
              data.interventions.map((intervention) => (
                <Link
                  key={intervention.id}
                  href={`/interventions/${intervention.id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{intervention.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {intervention.location ?? "No location"} ·{" "}
                        {intervention.scheduledAt ? new Date(intervention.scheduledAt).toLocaleString() : "Unscheduled"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                        {intervention.status.replace("_", " ")}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {intervention.priority}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">No interventions are linked to this client yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Invoices</h2>
              <p className="mt-1 text-sm text-slate-500">Billing records generated for this client.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {data.invoices.length} total
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {data.invoices.length ? (
              data.invoices.map((invoice) => (
                <article key={invoice.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">Invoice #{invoice.id.slice(0, 8)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Issued {new Date(invoice.issuedAt).toLocaleDateString()} · {invoice.items.length} line item{invoice.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-950">{formatMoney(invoice.total)}</p>
                      <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500">No invoices have been created for this client yet.</p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
