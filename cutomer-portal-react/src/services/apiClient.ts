const API_BASE_URL = "http://localhost:8080";

export async function apiClient(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = localStorage.getItem("accessToken");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && {
        Authorization: `Bearer ${accessToken}`,
      }),
      ...options.headers,
    },
  });

  // Access token expired / invalid
  if (response.status === 401) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    window.location.href = "/";
    
    throw new Error("Session expired. Please login again.");
  }

  return response;
}