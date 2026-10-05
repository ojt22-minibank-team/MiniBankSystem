
import {
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  ShieldCheck,
  User,
  Building2,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import Cropper, {
  type Area,
} from "react-easy-crop";

import {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
} from "../api/profileApi";

import type {
  CustomerProfile,
  CustomerProfileUpdate,
} from "../types/profileTypes";

import PersonalInfo from "./components/PersonalInfo";
import CompanyInfo from "./components/CompanyInfo";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ProfileFormData {
  address: string;
  city: string;
  stateRegion: string;
  country: string;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

export const PROFILE_UPDATED_EVENT =
  "customer-profile-updated";

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function revokeObjectUrl(
  url: string | null
): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function createImage(
  url: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () =>
        resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            "Failed to load image."
          )
        );

      image.src = url;
    }
  );
}

async function createCroppedImage(
  imageSrc: string,
  crop: Area
): Promise<Blob> {
  const image =
    await createImage(imageSrc);

  const canvas =
    document.createElement(
      "canvas"
    );

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Canvas is not supported."
    );
  }

  const scaleX =
    image.naturalWidth /
    image.width;

  const scaleY =
    image.naturalHeight /
    image.height;

  canvas.width = Math.round(
    crop.width * scaleX
  );

  canvas.height = Math.round(
    crop.height * scaleY
  );

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Failed to create cropped image."
              )
            );

            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        0.92
      );
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ProfilePage() {
  /* ------------------------------------------------------------------------ */
  /* Profile                                                                  */
  /* ------------------------------------------------------------------------ */

  const [
    profile,
    setProfile,
  ] =
    useState<CustomerProfile | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* Address form                                                             */
  /* ------------------------------------------------------------------------ */

  const [
    formData,
    setFormData,
  ] =
    useState<ProfileFormData>({
      address: "",
      city: "",
      stateRegion: "",
      country: "",
    });

  /* ------------------------------------------------------------------------ */
  /* Profile image                                                            */
  /* ------------------------------------------------------------------------ */

  const [
    previewImage,
    setPreviewImage,
  ] =
    useState<string | null>(
      null
    );

  const [
    croppedImageFile,
    setCroppedImageFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    cropSourceUrl,
    setCropSourceUrl,
  ] =
    useState<string | null>(
      null
    );

  /*
   * Controls whether photo Save / Cancel
   * buttons are visible.
   *
   * This is separate from address editing.
   */
  const [
    isPhotoEditing,
    setIsPhotoEditing,
  ] =
    useState(false);

  const [
    isPhotoSaving,
    setIsPhotoSaving,
  ] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Crop state                                                               */
  /* ------------------------------------------------------------------------ */

  const [
    crop,
    setCrop,
  ] =
    useState({
      x: 0,
      y: 0,
    });

  const [
    zoom,
    setZoom,
  ] =
    useState(1);

  const [
    croppedAreaPixels,
    setCroppedAreaPixels,
  ] =
    useState<Area | null>(
      null
    );

  const [
    isCropModalOpen,
    setIsCropModalOpen,
  ] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Address UI state                                                         */
  /* ------------------------------------------------------------------------ */

  const [
    isEditing,
    setIsEditing,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<string | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* Refs                                                                     */
  /* ------------------------------------------------------------------------ */

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const previewBlobUrlRef =
    useRef<string | null>(
      null
    );

  const cropSourceUrlRef =
    useRef<string | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* Customer type                                                            */
  /* ------------------------------------------------------------------------ */

  const isCompany =
    profile?.customerType ===
    "COMPANY" ||
    profile?.customerType ===
    "CORPORATE";

  /* ------------------------------------------------------------------------ */
  /* Form helpers                                                             */
  /* ------------------------------------------------------------------------ */

  const setFormDataFromProfile =
    useCallback(
      (data: CustomerProfile) => {
        setFormData({
          address:
            data.address ?? "",
          city:
            data.city ?? "",
          stateRegion:
            data.stateRegion ?? "",
          country:
            data.country ?? "",
        });
      },
      []
    );

  const clearMessages =
    useCallback(() => {
      setError(null);
      setSuccessMessage(null);
    }, []);

  /* ------------------------------------------------------------------------ */
  /* Input change                                                             */
  /* ------------------------------------------------------------------------ */

  const handleInputChange =
    useCallback(
      (
        event: ChangeEvent<HTMLInputElement>
      ) => {
        const {
          name,
          value,
        } = event.target;

        setFormData(
          (current) => ({
            ...current,
            [name]: value,
          })
        );

        setError(null);
        setSuccessMessage(null);
      },
      []
    );

  /* ------------------------------------------------------------------------ */
  /* Load profile                                                             */
  /* ------------------------------------------------------------------------ */

  const loadProfile =
    useCallback(
      async () => {
        try {
          setIsLoading(true);
          setError(null);

          const data =
            await getMyProfile();

          setProfile(data);

          setFormDataFromProfile(
            data
          );

          setPreviewImage(
            data.profileImageUrl ??
            null
          );
        } catch (err) {
          console.error(
            "Failed to load profile:",
            err
          );

          setError(
            "Failed to load your profile."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [setFormDataFromProfile]
    );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  /* ------------------------------------------------------------------------ */
  /* Cleanup                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    return () => {
      revokeObjectUrl(
        previewBlobUrlRef.current
      );

      revokeObjectUrl(
        cropSourceUrlRef.current
      );
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Address Edit                                                             */
  /* ------------------------------------------------------------------------ */

  const handleEdit =
    useCallback(() => {
      if (!profile) {
        return;
      }

      clearMessages();

      setFormDataFromProfile(
        profile
      );

      setIsEditing(true);
    }, [
      profile,
      clearMessages,
      setFormDataFromProfile,
    ]);

  /* ------------------------------------------------------------------------ */
  /* File picker                                                              */
  /* ------------------------------------------------------------------------ */

  const handleFileInputClick =
    useCallback(() => {
      if (
        isSaving ||
        isPhotoSaving
      ) {
        return;
      }

      fileInputRef.current?.click();
    }, [
      isSaving,
      isPhotoSaving,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Image selection                                                          */
  /* ------------------------------------------------------------------------ */

  const handleImageChange =
    useCallback(
      (
        event: ChangeEvent<HTMLInputElement>
      ) => {
        const file =
          event.target.files?.[0];

        event.target.value = "";

        if (!file) {
          return;
        }

        clearMessages();

        if (
          !ALLOWED_IMAGE_TYPES.includes(
            file.type
          )
        ) {
          setError(
            "Only JPG, PNG and WEBP images are allowed."
          );

          return;
        }

        if (
          file.size >
          MAX_FILE_SIZE
        ) {
          setError(
            "Profile image must not exceed 5MB."
          );

          return;
        }

        /*
         * Photo editing is independent
         * from address editing.
         */
        setIsPhotoEditing(true);

        revokeObjectUrl(
          cropSourceUrlRef.current
        );

        const sourceUrl =
          URL.createObjectURL(
            file
          );

        cropSourceUrlRef.current =
          sourceUrl;

        setCrop({
          x: 0,
          y: 0,
        });

        setZoom(1);

        setCroppedAreaPixels(
          null
        );

        setCropSourceUrl(
          sourceUrl
        );

        setIsCropModalOpen(
          true
        );
      },
      [clearMessages]
    );

  /* ------------------------------------------------------------------------ */
  /* Crop complete                                                            */
  /* ------------------------------------------------------------------------ */

  const handleCropComplete =
    useCallback(
      (
        _croppedArea: Area,
        croppedAreaPixelsValue: Area
      ) => {
        setCroppedAreaPixels(
          croppedAreaPixelsValue
        );
      },
      []
    );

  /* ------------------------------------------------------------------------ */
  /* Close crop modal                                                         */
  /* ------------------------------------------------------------------------ */

  const closeCropModal =
    useCallback(() => {
      setIsCropModalOpen(
        false
      );

      revokeObjectUrl(
        cropSourceUrlRef.current
      );

      cropSourceUrlRef.current =
        null;

      setCropSourceUrl(
        null
      );

      setCrop({
        x: 0,
        y: 0,
      });

      setZoom(1);

      setCroppedAreaPixels(
        null
      );
    }, []);

  /* ------------------------------------------------------------------------ */
  /* Cancel crop                                                              */
  /* ------------------------------------------------------------------------ */

  const handleCropCancel =
    useCallback(() => {
      closeCropModal();

      /*
       * If there was no previously cropped
       * photo, remain in the previous state.
       */
      if (
        !croppedImageFile
      ) {
        setIsPhotoEditing(false);
      }
    }, [
      closeCropModal,
      croppedImageFile,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Apply crop                                                               */
  /* ------------------------------------------------------------------------ */

  const handleCropSave =
    useCallback(
      async () => {
        if (
          !cropSourceUrl ||
          !croppedAreaPixels
        ) {
          return;
        }

        try {
          clearMessages();

          const croppedBlob =
            await createCroppedImage(
              cropSourceUrl,
              croppedAreaPixels
            );

          const croppedFile =
            new File(
              [croppedBlob],
              `profile-${Date.now()}.jpg`,
              {
                type: "image/jpeg",
              }
            );

          const previewUrl =
            URL.createObjectURL(
              croppedBlob
            );

          revokeObjectUrl(
            previewBlobUrlRef.current
          );

          previewBlobUrlRef.current =
            previewUrl;

          setCroppedImageFile(
            croppedFile
          );

          setPreviewImage(
            previewUrl
          );

          closeCropModal();
        } catch (err) {
          console.error(
            "Failed to crop image:",
            err
          );

          setError(
            "Failed to crop the selected image."
          );
        }
      },
      [
        cropSourceUrl,
        croppedAreaPixels,
        clearMessages,
        closeCropModal,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* Cancel PHOTO changes                                                     */
  /* ------------------------------------------------------------------------ */

  const handlePhotoCancel =
    useCallback(() => {
      if (isPhotoSaving) {
        return;
      }

      clearMessages();

      closeCropModal();

      revokeObjectUrl(
        previewBlobUrlRef.current
      );

      previewBlobUrlRef.current =
        null;

      setCroppedImageFile(
        null
      );

      /*
       * Restore server photo.
       */
      setPreviewImage(
        profile?.profileImageUrl ??
        null
      );

      setIsPhotoEditing(
        false
      );
    }, [
      isPhotoSaving,
      clearMessages,
      closeCropModal,
      profile,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Save PHOTO changes                                                       */
  /* ------------------------------------------------------------------------ */

  const handlePhotoSave =
    useCallback(
      async () => {
        if (
          !profile ||
          !croppedImageFile ||
          isPhotoSaving
        ) {
          return;
        }

        try {
          clearMessages();

          setIsPhotoSaving(
            true
          );

          /*
           * ONLY here does the photo
           * get uploaded to Cloudinary.
           */
          const updatedProfile =
            await uploadProfileImage(
              croppedImageFile
            );

          setProfile(
            updatedProfile
          );

          setPreviewImage(
            updatedProfile.profileImageUrl ??
            null
          );

          setCroppedImageFile(
            null
          );

          revokeObjectUrl(
            previewBlobUrlRef.current
          );

          previewBlobUrlRef.current =
            null;

          setIsPhotoEditing(
            false
          );

          setSuccessMessage(
            "Profile photo updated successfully."
          );

          setTimeout(() => {
            setSuccessMessage(null);
          }, 3000);

          /*
           * Update Navbar immediately.
           */
          window.dispatchEvent(
            new CustomEvent(
              PROFILE_UPDATED_EVENT,
              {
                detail:
                  updatedProfile,
              }
            )
          );
        } catch (err) {
          console.error(
            "Failed to update profile photo:",
            err
          );

          setError(
            "Failed to update your profile photo."
          );
        } finally {
          setIsPhotoSaving(
            false
          );
        }
      },
      [
        profile,
        croppedImageFile,
        isPhotoSaving,
        clearMessages,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* Cancel ADDRESS changes                                                   */
  /* ------------------------------------------------------------------------ */

  const handleCancel =
    useCallback(() => {
      if (
        !profile ||
        isSaving
      ) {
        return;
      }

      clearMessages();

      setFormDataFromProfile(
        profile
      );

      setIsEditing(false);
    }, [
      profile,
      isSaving,
      clearMessages,
      setFormDataFromProfile,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Save ADDRESS changes                                                     */
  /* ------------------------------------------------------------------------ */

  const handleSave =
    useCallback(
      async () => {
        if (
          !profile ||
          isSaving
        ) {
          return;
        }

        clearMessages();

        const hasAddressChanges =
          formData.address !==
          (profile.address ?? "") ||
          formData.city !==
          (profile.city ?? "") ||
          formData.stateRegion !==
          (profile.stateRegion ??
            "") ||
          formData.country !==
          (profile.country ?? "");

        if (!hasAddressChanges) {
          setIsEditing(false);
          return;
        }

        setIsSaving(true);

        try {
          const updateData:
            CustomerProfileUpdate =
          {
            address:
              formData.address,
            city:
              formData.city,
            stateRegion:
              formData.stateRegion,
            country:
              formData.country,
          };

          const updatedProfile =
            await updateMyProfile(
              updateData
            );

          setProfile(
            updatedProfile
          );

          setFormDataFromProfile(
            updatedProfile
          );

          setIsEditing(false);

          setSuccessMessage(
            "Address updated successfully."
          );

          setTimeout(() => {
            setSuccessMessage(null);
          }, 3000);
          /*
           * Navbar can use the updated
           * profile immediately.
           */
          window.dispatchEvent(
            new CustomEvent(
              PROFILE_UPDATED_EVENT,
              {
                detail:
                  updatedProfile,
              }
            )
          );
        } catch (err) {
          console.error(
            "Failed to update address:",
            err
          );

          setError(
            "Failed to update your address."
          );
        } finally {
          setIsSaving(false);
        }
      },
      [
        profile,
        isSaving,
        formData,
        clearMessages,
        setFormDataFromProfile,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                  */
  /* ------------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2
            size={22}
            className="animate-spin"
          />

          <span className="text-sm">
            Loading profile...
          </span>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* No profile                                                               */
  /* ------------------------------------------------------------------------ */

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">
          {error ??
            "Unable to load your profile."}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 py-8">


        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <X
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>
              {error}
            </span>
          </div>
        )}

        {/* SUCCESS */}
        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>
              {successMessage}
            </span>
          </div>
        )}

        {/* PROFILE SUMMARY */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="bg-gradient-to-r from-[#08295C] to-[#0878E8] px-6 py-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

              {/* PROFILE PHOTO */}
              <div className="relative h-32 w-32 shrink-0">

                <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-lg">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100">
                      {isCompany ? (
                        <Building2
                          size={48}
                          className="text-slate-400"
                        />
                      ) : (
                        <User
                          size={48}
                          className="text-slate-400"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* CAMERA BUTTON */}
                <button
                  type="button"
                  onClick={
                    handleFileInputClick
                  }
                  disabled={
                    isSaving ||
                    isPhotoSaving
                  }
                  aria-label="Change profile photo"
                  className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-[#0878E8] text-white shadow-md transition hover:bg-[#0668ca] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera
                    size={18}
                    strokeWidth={2.5}
                  />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={
                    handleImageChange
                  }
                />
              </div>

              {/* PHOTO ACTIONS */}
              {isPhotoEditing &&
                !isCropModalOpen && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={
                        handlePhotoCancel
                      }
                      disabled={
                        isPhotoSaving
                      }
                      className="rounded-xl border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={
                        handlePhotoSave
                      }
                      disabled={
                        !croppedImageFile ||
                        isPhotoSaving
                      }
                      className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#0878E8] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPhotoSaving && (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      )}

                      {isPhotoSaving
                        ? "Saving..."
                        : "Save"}
                    </button>
                  </div>
                )}

              {/* PROFILE SUMMARY */}
              <div className="min-w-0 text-white">
                <h2 className="truncate text-2xl font-bold">
                  {isCompany
                    ? profile.companyName ??
                    "Company"
                    : [
                      profile.firstName,
                      profile.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    "Customer"}
                </h2>

                <p className="mt-1 text-sm text-white/80">
                  Customer ID:{" "}
                  {profile.customerCode}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                    <ShieldCheck
                      size={14}
                    />

                    {profile.status}
                  </span>

                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                    {profile.customerType}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* REGISTERED INFO NOTICE */}
          <div className="flex items-start gap-3 border-t border-slate-100 px-6 py-4">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-[#0878E8]"
            />
            <p className="text-xs text-slate-500 leading-relaxed">
  <span className="font-semibold text-slate-700">Notice:</span> Please ensure your registered personal details, contact number, and email address are up to date. This information is strictly used for official banking notifications and account security verification.
</p>
          </div>
        </section>

        {/* PERSONAL / COMPANY INFORMATION */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#08295C]">
              {isCompany
                ? "Company Information"
                : "Personal Information"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Registered information is
              read-only. Address information
              can be updated.
            </p>
          </div>

          {isCompany ? (
            <CompanyInfo
              profile={profile}
              formData={formData}
              isEditing={isEditing}
              isSaving={isSaving}
              onInputChange={
                handleInputChange
              }
              onEdit={handleEdit}
              onCancel={handleCancel}
              onSave={handleSave}
            />
          ) : (
            <PersonalInfo
              profile={profile}
              formData={formData}
              isEditing={isEditing}
              isSaving={isSaving}
              onInputChange={
                handleInputChange
              }
              onEdit={handleEdit}
              onCancel={handleCancel}
              onSave={handleSave}
            />
          )}
        </section>

        {/* ADDRESS HINT */}
        {!isEditing && (
          <div className="mt-4 flex items-center gap-2 px-1 text-xs text-slate-400">
            <MapPin size={14} />

            <span>
              You can update your address
              information using Edit Profile.
            </span>
          </div>
        )}
      </div>

      {/* CROP MODAL */}
      {isCropModalOpen &&
        cropSourceUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-[#08295C]">
                    Crop Profile Photo
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Adjust your photo before
                    saving.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleCropCancel
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close crop modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative h-[380px] w-full bg-black">
                <Cropper
                  image={cropSourceUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={
                    setCrop
                  }
                  onZoomChange={
                    setZoom
                  }
                  onCropComplete={
                    handleCropComplete
                  }
                />
              </div>

              <div className="px-5 pt-5">
                <label
                  htmlFor="profile-photo-zoom"
                  className="mb-2 block text-xs font-medium text-slate-600"
                >
                  Zoom
                </label>

                <input
                  id="profile-photo-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(
                    event
                  ) =>
                    setZoom(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-full accent-[#0878E8]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 px-5 py-5">
                <button
                  type="button"
                  onClick={
                    handleCropCancel
                  }
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleCropSave
                  }
                  disabled={
                    !croppedAreaPixels
                  }
                  className="rounded-lg bg-[#0878E8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0668ca] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
