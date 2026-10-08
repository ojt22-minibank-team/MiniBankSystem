import {
  Camera,
  CheckCircle2,
  Loader2,
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

import { useNavigate } from "react-router-dom";

import {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
} from "../api/profileApi";

import type {
  CustomerProfile,
  CustomerProfileUpdate,
} from "../types/profileTypes";

import {
  requestPinReset,
} from "../../../services/authService";

import {
  useAppDispatch,
  useAppSelector,
} from "../../../lib/redux";

import { setProfile } from "./ProfileSlice";

import PersonalInfo from "./components/PersonalInfo";
import CompanyInfo from "./components/CompanyInfo";
import ProfileSkeleton from "./components/ProfileSkeleton";
import ProfileErrorState from "./components/ProfileErrorState";
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
    document.createElement("canvas");

  const context =
    canvas.getContext("2d");

  if (!context) {
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

  canvas.width =
    Math.round(
      crop.width * scaleX
    );

  canvas.height =
    Math.round(
      crop.height * scaleY
    );

  context.drawImage(
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
  const navigate =
    useNavigate();

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
  /* Profile                                                                   */
  /* ------------------------------------------------------------------------ */

  const dispatch = useAppDispatch();

  const profile = useAppSelector(
    (state) => state.profile.profile
  );

  /* ------------------------------------------------------------------------ */
  /* Address form                                                              */
  /* ------------------------------------------------------------------------ */

  const [
    formData,
    setFormData,
  ] = useState<ProfileFormData>({
    address: "",
    city: "",
    stateRegion: "",
    country: "",
  });

  /* ------------------------------------------------------------------------ */
  /* Profile image                                                             */
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
  /* Crop state                                                                */
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
  /* Address UI state                                                          */
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

  /* ------------------------------------------------------------------------ */
  /* PIN reset state                                                           */
  /* ------------------------------------------------------------------------ */

  const [
    pinResetLoading,
    setPinResetLoading,
  ] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Messages                                                                  */
  /* ------------------------------------------------------------------------ */

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
  /* Customer type                                                             */
  /* ------------------------------------------------------------------------ */

  const isCompany =
    profile?.customerType
      ?.toUpperCase() ===
    "COMPANY" ||
    profile?.customerType
      ?.toUpperCase() ===
    "CORPORATE";

  /* ------------------------------------------------------------------------ */
  /* Form helpers                                                              */
  /* ------------------------------------------------------------------------ */

  const setFormDataFromProfile =
    useCallback(
      (
        data: CustomerProfile
      ) => {
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
  /* Load profile                                                              */
  /* ------------------------------------------------------------------------ */

  const loadProfile =
    useCallback(
      async () => {
        try {
          setIsLoading(true);
          setError(null);

          const data =
            await getMyProfile();

          dispatch(setProfile(data));

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
            "Unable to load your profile information right now. Please try again."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [setFormDataFromProfile, dispatch]
    );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  /* ------------------------------------------------------------------------ */
  /* Cleanup object URLs                                                       */
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
  /* Address edit                                                              */
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
  /* Address cancel                                                            */
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
  /* Address input                                                             */
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
  /* Open file picker                                                          */
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
  /* Image selection                                                           */
  /* ------------------------------------------------------------------------ */

  const handleImageChange =
    useCallback(
      (
        event: ChangeEvent<HTMLInputElement>
      ) => {
        const file =
          event.target.files?.[0];

        /*
         * Allows selecting the same
         * image again later.
         */
        event.target.value = "";

        if (!file) {
          return;
        }

        clearMessages();

        /* Validate image type */
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

        /* Validate file size */
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
         * Revoke previous crop source.
         */
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

        setIsPhotoEditing(
          true
        );

        setIsCropModalOpen(
          true
        );
      },
      [clearMessages]
    );

  /* ------------------------------------------------------------------------ */
  /* Crop complete                                                             */
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
  /* Close crop modal                                                          */
  /* ------------------------------------------------------------------------ */

  const closeCropModal =
    useCallback(() => {
      setIsCropModalOpen(false);

      revokeObjectUrl(
        cropSourceUrlRef.current
      );

      cropSourceUrlRef.current =
        null;

      setCropSourceUrl(null);

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
  /* Cancel crop                                                               */
  /* ------------------------------------------------------------------------ */

  const handleCropCancel =
    useCallback(() => {
      closeCropModal();

      /*
       * If there is no previously
       * cropped image, photo editing
       * should also be cancelled.
       */
      if (!croppedImageFile) {
        setIsPhotoEditing(false);
      }
    }, [
      closeCropModal,
      croppedImageFile,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Apply crop                                                                */
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

          /*
           * Create local preview.
           */
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
  /* Cancel photo changes                                                     */
  /* ------------------------------------------------------------------------ */

  const handlePhotoCancel =
    useCallback(() => {
      if (isPhotoSaving) {
        return;
      }

      closeCropModal();

      revokeObjectUrl(
        previewBlobUrlRef.current
      );

      previewBlobUrlRef.current =
        null;

      setCroppedImageFile(
        null
      );

      setPreviewImage(
        profile?.profileImageUrl ??
        null
      );

      setIsPhotoEditing(
        false
      );

      clearMessages();
    }, [
      isPhotoSaving,
      profile,
      closeCropModal,
      clearMessages,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Save photo changes                                                        */
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

          setIsPhotoSaving(true);

          /*
           * Upload cropped image only.
           */
          const updatedProfile =
            await uploadProfileImage(
              croppedImageFile
            );

          dispatch(setProfile(updatedProfile));

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
          window.setTimeout(() => {
            setSuccessMessage(
              null
            );
          }, 3000);
        } catch (err) {
          console.error(
            "Failed to update profile photo:",
            err
          );

          setError(
            "Failed to update your profile photo."
          );
        } finally {
          setIsPhotoSaving(false);
        }
      },
      [
        profile,
        croppedImageFile,
        isPhotoSaving,
        clearMessages,
        dispatch,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* Save address                                                              */
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

        try {
          setIsSaving(true);

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

          dispatch(setProfile(updatedProfile));

          setFormDataFromProfile(
            updatedProfile
          );

          setIsEditing(false);

          setSuccessMessage(
            "Address updated successfully."
          );
          window.setTimeout(() => {
            setSuccessMessage(
              null
            );
          }, 3000);
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
        dispatch,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* Forgot Transaction PIN                                                   */
  /* ------------------------------------------------------------------------ */

  const handleForgotPin =
    useCallback(
      async () => {
        if (pinResetLoading) {
          return;
        }

        try {
          setPinResetLoading(true);

          clearMessages();

          /*
           * Remove previous PIN reset
           * session information.
           */
          sessionStorage.removeItem(
            "pinResetChallengeGroupId"
          );

          sessionStorage.removeItem(
            "pinResetMaskedEmail"
          );

          sessionStorage.removeItem(
            "verifiedPinResetChallengeGroupId"
          );

          /*
           * Request OTP.
           *
           * POST
           * /api/customer/auth/pin-reset/request
           */
          const response =
            await requestPinReset();

          if (
            !response.challengeGroupId
          ) {
            setError(
              "PIN reset verification information is missing."
            );

            return;
          }

          /*
           * Save challenge information.
           */
          sessionStorage.setItem(
            "pinResetChallengeGroupId",
            response.challengeGroupId
          );

          if (
            response.destinationMasked
          ) {
            sessionStorage.setItem(
              "pinResetMaskedEmail",
              response.destinationMasked
            );
          }

          /*
           * Navigate to OTP page.
           */
          navigate(
            "/pin-reset/otp"
          );
        } catch (err: unknown) {
          console.error(
            "Failed to start PIN reset:",
            err
          );

          const axiosError =
            err as {
              response?: {
                data?: {
                  message?: string;
                };
              };
            };

          setError(
            axiosError.response?.data
              ?.message ??
            "Unable to start Transaction PIN reset. Please try again."
          );
        } finally {
          setPinResetLoading(
            false
          );
        }
      },
      [
        pinResetLoading,
        clearMessages,
        navigate,
      ]
    );

    

  /* ------------------------------------------------------------------------ */
  /* Full name                                                                 */
  /* ------------------------------------------------------------------------ */

  const getFullName =
    useCallback(() => {
      if (!profile) {
        return "";
      }

      if (isCompany) {
        return (
          profile.companyName ??
          "Company"
        );
      }

      return (
        [
          profile.firstName,
          profile.lastName,
        ]
          .filter(Boolean)
          .join(" ") ||
        "Customer"
      );
    }, [
      profile,
      isCompany,
    ]);

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                   */
  /* ------------------------------------------------------------------------ */

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error || !profile) {
  return (
    <ProfileErrorState
      onRetry={loadProfile}
      message={
        error ??
        "We couldn't retrieve your profile information right now."
      }
    />
  );
}

  /* ------------------------------------------------------------------------ */
  /* No profile                                                                */
  /* ------------------------------------------------------------------------ */

  if (!profile) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#F5F7FB] p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-100 bg-white p-8 text-center">
          <p className="text-sm font-medium text-red-600">
            {error ??
              "Unable to load your profile."}
          </p>

          <button
            type="button"
            onClick={() => {
              void loadProfile();
            }}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F5F7FB] px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* ================================================================ */}
        {/* MESSAGES                                                          */}
        {/* ================================================================ */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            <X
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>
              {error}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>
              {successMessage}
            </span>
          </div>
        )}

        {/* ================================================================ */}
        {/* PROFILE SUMMARY                                                   */}
        {/* ================================================================ */}

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="bg-gradient-to-r from-[#08295C] to-[#0878E8] px-6 py-8">

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

              {/* ---------------------------------------------------------- */}
              {/* PROFILE PHOTO                                               */}
              {/* ---------------------------------------------------------- */}

              <div className="relative h-28 w-28 shrink-0">

                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-lg">

                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={getFullName()}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100">
                      {isCompany ? (
                        <Building2
                          size={42}
                          className="text-slate-400"
                        />
                      ) : (
                        <User
                          size={42}
                          className="text-slate-400"
                        />
                      )}
                    </div>
                  )}

                </div>

                {/* Camera button */}

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
                  title="Change profile photo"
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#0878E8] text-white shadow-md transition hover:bg-[#0668ca] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Camera
                    size={17}
                  />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleImageChange
                  }
                  className="hidden"
                />

              </div>

              {/* ---------------------------------------------------------- */}
              {/* PROFILE DETAILS                                             */}
              {/* ---------------------------------------------------------- */}

              <div className="min-w-0 flex-1 text-white">

                <h2 className="truncate text-2xl font-bold">
                  {getFullName()}
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

                {/* Photo actions */}

                {isPhotoEditing &&
                  !isCropModalOpen && (
                    <div className="mt-4 flex flex-wrap gap-3">

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
                          : "Save Photo"}
                      </button>

                    </div>
                  )}

              </div>

            </div>

          </div>

          {/* Registered info notice */}

          <div className="flex items-start gap-3 border-t border-slate-100 px-6 py-4">

            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-[#0878E8]"
            />

            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700">
                Notice:
              </span>{" "}
              Registered personal details,
              contact information and
              email are read-only.
              Address information can be
              updated from Edit Profile.
            </p>

          </div>

        </section>

        {/* ================================================================ */}
        {/* PERSONAL / COMPANY INFORMATION                                   */}
        {/* ================================================================ */}

        {isCompany ? (
          <CompanyInfo
            profile={profile}
            formData={formData}
            isEditing={isEditing}
            onInputChange={handleInputChange}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onSave={handleSave}
            isSaving={isSaving}
          />
        ) : (
          <PersonalInfo
            profile={profile}
            formData={formData}
            isEditing={isEditing}
            onInputChange={handleInputChange}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}

        {!isEditing && (
          <div className="mt-4 flex items-center gap-2 px-1 text-xs text-slate-400">
          </div>
        )}


        {/* ================================================================ */}
        {/* SECURITY                                                          */}
        {/* ================================================================ */}

        <section>

          <div className="mb-3 flex items-center gap-2">

            <ShieldCheck
              size={20}
              className="text-[#08295C]"
            />

            <h2 className="text-lg font-bold text-[#08295C]">
              Security
            </h2>

          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Password */}

            <SecurityRow
              label="Password"
              action="Change"
              onClick={() => {
                /*
                 * Connect existing password
                 * change route here.
                 */
              }}
            />

            {/* Transaction PIN */}

            <SecurityRow
              label="Transaction PIN"
              action={
                pinResetLoading
                  ? "Sending OTP..."
                  : "Forgot Transaction PIN"
              }
              onClick={
                handleForgotPin
              }
              disabled={
                pinResetLoading
              }
            />



          </div>

        </section>

      </div>

      {/* ================================================================ */}
      {/* CROP MODAL                                                        */}
      {/* ================================================================ */}

      {isCropModalOpen &&
        cropSourceUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">

            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">

              {/* Modal header */}

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
                  <X
                    size={20}
                  />
                </button>

              </div>

              {/* Crop area */}

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

              {/* Zoom */}

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

              {/* Modal actions */}

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

    </div>
  );
}

/* ==========================================================================
   SECURITY ROW
============================================================================= */

interface SecurityRowProps {
  label: string;
  action: string;
  onClick: () => void;
  disabled?: boolean;
}

function SecurityRow({
  label,
  action,
  onClick,
  disabled = false,
}: SecurityRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 last:border-b-0">

      <div>
        <p className="text-sm font-semibold text-slate-700">
          {label}
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {action} →
      </button>

    </div>
  );
}