import type { DashboardResponse } from "../types/dashboardTypes";

const API_BASE_URL = "http://localhost:8080";

export async function getCustomerDashboard(): Promise<DashboardResponse> {
  const accessToken = localStorage.getItem("customerAccessToken");

  if (!accessToken) {
    throw new Error("Customer access token not found.");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/customer/dashboard`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Dashboard request failed: ${response.status}`
    );
  }

  return response.json();
}