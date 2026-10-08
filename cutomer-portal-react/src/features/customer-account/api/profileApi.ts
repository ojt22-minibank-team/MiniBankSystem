import api from "../../../config/api";

import type {
  CustomerProfile,
  CustomerProfileUpdate,
} from "../types/profileTypes";

export async function getMyProfile(): Promise<CustomerProfile> {
  const response = await api.get<CustomerProfile>("/profile");

  return response.data;
}

export async function updateMyProfile(
  data: CustomerProfileUpdate
): Promise<CustomerProfile> {
  const response =
    await api.put<CustomerProfile>("/profile", data);

  return response.data;
}

export async function uploadProfileImage(
  file: File
): Promise<CustomerProfile> {
  const formData = new FormData();

  formData.append("file", file);

  const response =
    await api.post<CustomerProfile>(
      "/profile/image",
      formData
    );

  return response.data;
}