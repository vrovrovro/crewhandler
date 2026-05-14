"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { clientContracts, clientListResponseSchema, createClientSchema } from "@acme/shared";
import { createAuthedApi, apiContracts } from "../../../lib/api";
import { getAccessToken } from "../../../lib/session-client";
import { ClientForm } from "../../../components/forms/client-form";
import { Modal } from "../../../components/overlay/modal";
import { DataTable } from "../../../components/tables/data-table";
import { StateCard } from "../../../components/feedback/state-card";
import { MobileKebabMenu } from "../../../components/menus/mobile-kebab-menu";
import { z } from "zod";
import { readViewCache, writeViewCache } from "../../../lib/view-cache";

type ClientListResponse = z.infer<typeof clientListResponseSchema>;
type ClientItem = ClientListResponse["items"][number];
type CreateClientInput = z.infer<typeof createClientSchema>;

export default function ClientsPage() {
  const [data, setData] = useState<ClientListResponse | null>(() => readViewCache<ClientListResponse>("clients"));
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientItem | null>(null);

  const load = async () => {
    try {
      const api = createAuthedApi(getAccessToken);
      const result = await api.request(apiContracts.clients, {
        query: { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" },
      });
      setData(result);
      writeViewCache("clients", result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load clients");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createClient = async (values: CreateClientInput) => {
    const api = createAuthedApi(getAccessToken);
    await api.request(clientContracts.create, {
      body: values,
    });
    await load();
    setCreateOpen(false);
  };

  const updateClient = async (values: CreateClientInput) => {
    if (!editClient) return;
    const api = createAuthedApi(getAccessToken);
    await api.request(clientContracts.update, {
      pathParams: { id: editClient.id },
      body: values,
    });
    await load();
    setEditClient(null);
  };

  const removeClient = async (id: string) => {
    const confirmed = window.confirm("Delete this client and every linked job/invoice record?");
    if (!confirmed) return;

    const api = createAuthedApi(getAccessToken);
    await api.request(clientContracts.remove, {
      pathParams: { id },
    });
    await load();
  };

  return (
    <div className="space-y-4">
      {error ? (
        <StateCard title="Unable to load clients" description={error} />
      ) : data ? (
        <DataTable
          title="Clients"
          subtitle={`${data.total} client records`}
          mobileLayout="table"
          mobileContent={
            <div className="divide-y divide-slate-200">
              {data.items.map((client) => (
                <article key={client.id} className="flex items-start justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{client.name}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{client.phone ?? "No phone"}</p>
                  </div>
                  <MobileKebabMenu
                    items={[
                      { label: "View", href: `/clients/${client.id}` },
                      { label: "Edit", onClick: () => setEditClient(client) },
                      { label: "Delete", onClick: () => void removeClient(client.id), tone: "danger" },
                    ]}
                  />
                </article>
              ))}
            </div>
          }
          actions={
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              New client
            </button>
          }
          columns={["Name", "Phone", "Email", "Address", "Actions"]}
          rows={data.items.map((client) => [
            client.name,
            client.phone ?? "No phone",
            client.email ?? "No email",
            client.address ?? "No address",
            <div key={client.id} className="flex flex-wrap gap-2">
              <Link
                href={`/clients/${client.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <Eye className="h-4 w-4" />
                View
              </Link>
              <button
                type="button"
                onClick={() => setEditClient(client)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => removeClient(client.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>,
          ])}
        />
      ) : (
        <StateCard title="Loading clients" description="Fetching organization-scoped client records from the API." />
      )}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create client"
        description="Add a new customer record to your workspace."
      >
        <ClientForm onSubmitClient={createClient} />
      </Modal>
      <Modal
        open={Boolean(editClient)}
        onClose={() => setEditClient(null)}
        title="Edit client"
        description="Update the customer record."
      >
        {editClient ? (
          <ClientForm
            initialValues={{
              name: editClient.name,
              phone: editClient.phone ?? "",
              email: editClient.email ?? "",
              address: editClient.address ?? "",
              notes: editClient.notes ?? "",
            }}
            submitLabel="Save changes"
            onSubmitClient={updateClient}
          />
        ) : null}
      </Modal>
    </div>
  );
}
