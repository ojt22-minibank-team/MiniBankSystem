import api from "../../../config/api";
import type { DashboardResponse } from "../types/dashboardTypes";

export async function getCustomerDashboard(): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>("/dashboard");

  return response.data;
}