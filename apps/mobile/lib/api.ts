import {
  createApiClient,
  interventionContracts,
  type InterventionStatus,
} from "@acme/shared";
import { supabaseMobile } from "./supabase";

const client = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
  getAccessToken: async () => {
    const result = await supabaseMobile.auth.getSession();
    return result.data.session?.access_token ?? null;
  },
});

export const mobileApi = {
  listAssignedJobs: () => client.request(interventionContracts.list),
  updateStatus: (id: string, status: InterventionStatus, note?: string) =>
    client.request(interventionContracts.updateStatus, {
      pathParams: { id },
      body: { status, note },
    }),
};
