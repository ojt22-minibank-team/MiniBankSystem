
import api from "../../../../config/api";
import type { DashboardResponse } from "../types/dashboardTypes";

export async function getCustomerDashboard(
  signal?: AbortSignal,
): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>("/dashboard", {
    signal,
  });

  return response.data;
}
