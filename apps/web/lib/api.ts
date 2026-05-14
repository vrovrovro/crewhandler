import {
  clientContracts,
  createApiClient,
  dashboardContracts,
  interventionContracts,
  invoiceContracts,
} from "@acme/shared";

export const createAuthedApi = (getAccessToken: () => string | null | Promise<string | null>) =>
  createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    getAccessToken,
  });

export const apiContracts = {
  dashboard: dashboardContracts.overview,
  clients: clientContracts.list,
  interventions: interventionContracts.list,
  invoices: invoiceContracts.list,
};
