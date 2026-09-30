import type { DashboardResponse } from "../types/dashboardTypes";
import { apiClient } from "../../../services/apiClient";

export async function getCustomerDashboard(): Promise<DashboardResponse> {
  const response = await apiClient("/api/customer/dashboard", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `Dashboard request failed: ${response.status}`
    );
  }

  return response.json();
}