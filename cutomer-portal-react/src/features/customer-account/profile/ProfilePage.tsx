import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ShieldCheck,
  User,
  Building2,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type * as React from "react";

import {
  useNavigate,
} from "react-router-dom";

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

import PersonalInfo from "./components/PersonalInfo";
import CompanyInfo from "./components/CompanyInfo";


export default function ProfilePage() {

  // =====================================================
  // NAVIGATION
  // =====================================================

  const navigate =
    useNavigate();


  // =====================================================
  // REFERENCES
  // =====================================================

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  // =====================================================
  // PROFILE STATE
  // =====================================================

  const [profile, setProfile] =
    useState<CustomerProfile | null>(
      null
    );


  const [formData, setFormData] =
    useState<CustomerProfileUpdate>({
      address: "",
      city: "",
      stateRegion: "",
      country: "",
    });


  const [previewImage, setPreviewImage] =
    useState<string | null>(
      null
    );


  const [selectedImage, setSelectedImage] =
    useState<File | null>(
      null
    );


  // =====================================================
  // PAGE STATE
  // =====================================================

  const [isEditing, setIsEditing] =
    useState(false);


  const [isLoading, setIsLoading] =
    useState(true);


  const [isSaving, setIsSaving] =
    useState(false);


  const [
    pinResetLoading,
    setPinResetLoading,
  ] = useState(false);


  const [error, setError] =
    useState("");


  const [success, setSuccess] =
    useState("");


  // =====================================================
  // COMPANY CUSTOMER CHECK
  // =====================================================

  const isCompany =
    profile?.customerType?.toUpperCase()
      === "COMPANY"
    ||
    profile?.customerType?.toUpperCase()
      === "CORPORATE";


  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {

    loadProfile();

  }, []);


  const loadProfile =
    async () => {

      try {

        setIsLoading(true);

        setError("");


        const data =
          await getMyProfile();


        setProfile(
          data
        );


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


        setPreviewImage(
          data.profileImageUrl
            ?? null
        );


      } catch (err) {

        console.error(
          "Failed to load profile:",
          err
        );


        setError(
          "Failed to load your profile. Please try again."
        );


      } finally {

        setIsLoading(
          false
        );

      }

    };


  // =====================================================
  // ENTER EDIT MODE
  // =====================================================

  const handleEdit =
    () => {

      if (!profile) {
        return;
      }


      setFormData({

        address:
          profile.address ?? "",

        city:
          profile.city ?? "",

        stateRegion:
          profile.stateRegion ?? "",

        country:
          profile.country ?? "",

      });


      setSelectedImage(
        null
      );


      setPreviewImage(
        profile.profileImageUrl
          ?? null
      );


      setError("");

      setSuccess("");


      setIsEditing(
        true
      );

    };


  // =====================================================
  // CANCEL EDITING
  // =====================================================

  const handleCancel =
    () => {

      if (!profile) {
        return;
      }


      setFormData({

        address:
          profile.address ?? "",

        city:
          profile.city ?? "",

        stateRegion:
          profile.stateRegion ?? "",

        country:
          profile.country ?? "",

      });


      setSelectedImage(
        null
      );


      setPreviewImage(
        profile.profileImageUrl
          ?? null
      );


      setError("");

      setSuccess("");


      setIsEditing(
        false
      );

    };


  // =====================================================
  // ADDRESS INPUT
  // =====================================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const {
      name,
      value,
    } = e.target;


    setFormData(
      (prev) => ({

        ...prev,

        [name]:
          value,

      })
    );

  };


  // =====================================================
  // PROFILE IMAGE SELECTION
  // =====================================================

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      e.target.files?.[0];


    if (!file) {
      return;
    }


    // ----------------------------------------------
    // Validate image type
    // ----------------------------------------------

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      setError(
        "Please select a valid image file."
      );

      return;
    }


    // ----------------------------------------------
    // Maximum 5 MB
    // ----------------------------------------------

    if (
      file.size >
      5 * 1024 * 1024
    ) {

      setError(
        "Profile image must be smaller than 5 MB."
      );

      return;
    }


    setError("");


    setSelectedImage(
      file
    );


    const imageUrl =
      URL.createObjectURL(
        file
      );


    setPreviewImage(
      imageUrl
    );

  };


  // =====================================================
  // SAVE ADDRESS + PROFILE IMAGE
  // =====================================================

  const handleSave =
    async () => {

      if (!profile) {
        return;
      }


      try {

        setIsSaving(
          true
        );


        setError("");

        setSuccess("");


        // ----------------------------------------------
        // 1. Update address
        // ----------------------------------------------

        let finalProfile =
          await updateMyProfile(
            formData
          );


        // ----------------------------------------------
        // 2. Upload profile image
        // ----------------------------------------------

        if (
          selectedImage
        ) {

          finalProfile =
            await uploadProfileImage(
              selectedImage
            );

        }


        // ----------------------------------------------
        // 3. Update local state
        // ----------------------------------------------

        setProfile(
          finalProfile
        );


        setFormData({

          address:
            finalProfile.address
              ?? "",

          city:
            finalProfile.city
              ?? "",

          stateRegion:
            finalProfile.stateRegion
              ?? "",

          country:
            finalProfile.country
              ?? "",

        });


        setPreviewImage(
          finalProfile.profileImageUrl
            ?? null
        );


        setSelectedImage(
          null
        );


        setSuccess(
          "Profile updated successfully."
        );


        setIsEditing(
          false
        );


      } catch (err) {

        console.error(
          "Failed to update profile:",
          err
        );


        setError(
          "Failed to update your profile. Please try again."
        );


      } finally {

        setIsSaving(
          false
        );

      }

    };


  // =====================================================
  // FORGOT TRANSACTION PIN
  // =====================================================

  const handleForgotPin =
    async () => {

      // Prevent double click
      if (
        pinResetLoading
      ) {

        return;
      }


      try {

        setPinResetLoading(
          true
        );


        setError("");

        setSuccess("");


        // ----------------------------------------------
        // 1. Clear previous PIN reset information
        // ----------------------------------------------

        sessionStorage.removeItem(
          "pinResetChallengeGroupId"
        );


        sessionStorage.removeItem(
          "pinResetMaskedEmail"
        );


        sessionStorage.removeItem(
          "verifiedPinResetChallengeGroupId"
        );


        // ----------------------------------------------
        // 2. Request PIN reset OTP
        //
        // POST
        // /api/customer/auth/pin-reset/request
        //
        // Access Token will be added by api.ts
        // interceptor.
        // ----------------------------------------------

        const response =
          await requestPinReset();


        // ----------------------------------------------
        // 3. Validate backend response
        // ----------------------------------------------

        if (
          !response.challengeGroupId
        ) {

          setError(
            "PIN reset verification information is missing."
          );

          return;
        }


        // ----------------------------------------------
        // 4. Save challengeGroupId
        // ----------------------------------------------

        sessionStorage.setItem(
          "pinResetChallengeGroupId",
          response.challengeGroupId
        );


        // ----------------------------------------------
        // 5. Save masked registered email
        // ----------------------------------------------

        if (
          response.destinationMasked
        ) {

          sessionStorage.setItem(
            "pinResetMaskedEmail",
            response.destinationMasked
          );

        }


        // ----------------------------------------------
        // 6. Go to PIN Reset OTP page
        // ----------------------------------------------

        navigate(
          "/pin-reset/otp"
        );


      } catch (err: any) {

        setError(
          err.response?.data?.message
          ||
          "Unable to start Transaction PIN reset. Please try again."
        );


      } finally {

        setPinResetLoading(
          false
        );

      }

    };


  // =====================================================
  // FULL NAME
  // =====================================================

  const getFullName =
    () => {

      if (!profile) {
        return "";
      }


      if (
        isCompany
      ) {

        return (
          profile.companyName
          ||
          "Company"
        );

      }


      return (

        [
          profile.firstName,
          profile.lastName,
        ]

          .filter(
            Boolean
          )

          .join(" ")

        ||

        "Customer"

      );

    };


  // =====================================================
  // LOADING STATE
  // =====================================================

  if (
    isLoading
  ) {

    return (

      <div
        className="
          flex
          min-h-[calc(100vh-80px)]
          items-center
          justify-center
          bg-[#F5F7FB]
        "
      >

        <div
          className="text-center"
        >

          <div
            className="
              mx-auto
              mb-4
              h-10
              w-10
              animate-spin
              rounded-full
              border-4
              border-slate-200
              border-t-blue-600
            "
          />


          <p
            className="
              text-sm
              font-medium
              text-slate-500
            "
          >

            Loading profile...

          </p>

        </div>

      </div>

    );

  }


  // =====================================================
  // PROFILE LOADING FAILED
  // =====================================================

  if (
    !profile
  ) {

    return (

      <div
        className="
          min-h-[calc(100vh-80px)]
          bg-[#F5F7FB]
          p-8
        "
      >

        <div
          className="
            mx-auto
            max-w-5xl
            rounded-2xl
            border
            border-red-100
            bg-white
            p-8
            text-center
          "
        >

          <p
            className="
              text-sm
              font-medium
              text-red-600
            "
          >

            {
              error
              ||
              "Unable to load profile."
            }

          </p>


          <button

            type="button"

            onClick={
              loadProfile
            }

            className="
              mt-4
              rounded-lg
              bg-blue-600
              px-5
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-blue-700
            "
          >

            Try Again

          </button>

        </div>

      </div>

    );

  }


  // =====================================================
  // PAGE UI
  // =====================================================

  return (

    <div
      className="
        min-h-[calc(100vh-80px)]
        bg-[#F5F7FB]
        px-6
        py-8
        lg:px-8
      "
    >

      <div
        className="
          mx-auto
          max-w-5xl
        "
      >


        {/* ==============================================
            PAGE HEADER
        ============================================== */}

        <div
          className="mb-8"
        >

          <div
            className="
              mb-3
              flex
              items-center
              gap-3
            "
          >

            <button

              type="button"

              onClick={() =>
                window.history.back()
              }

              className="
                rounded-lg
                p-2
                text-slate-500
                transition
                hover:bg-white
                hover:text-slate-700
              "
            >

              <ArrowLeft
                size={20}
              />

            </button>


            <div>

              <h1
                className="
                  text-2xl
                  font-bold
                  text-[#08295C]
                "
              >

                My Profile

              </h1>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >

                Manage your personal information

              </p>

            </div>

          </div>

        </div>


        {/* ==============================================
            SUCCESS MESSAGE
        ============================================== */}

        {
          success
          &&
          (

            <div
              className="
                mb-6
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-4
                py-3
                text-sm
                font-medium
                text-emerald-700
              "
            >

              <CheckCircle2
                size={18}
              />

              {success}

            </div>

          )
        }


        {/* ==============================================
            ERROR MESSAGE
        ============================================== */}

        {
          error
          &&
          (

            <div
              className="
                mb-6
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                font-medium
                text-red-600
              "
            >

              <X
                size={18}
              />

              {error}

            </div>

          )
        }


        {/* ==============================================
            PROFILE HEADER
        ============================================== */}

        <div
          className="
            mb-6
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-6
            shadow-sm
          "
        >

          <div
            className="
              flex
              flex-col
              gap-6
              sm:flex-row
              sm:items-center
            "
          >


            {/* Profile Image */}

            <div
              className="
                relative
                shrink-0
              "
            >

              <div
                className="
                  flex
                  h-24
                  w-24
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-full
                  border-4
                  border-slate-100
                  bg-slate-100
                "
              >

                {
                  previewImage
                    ? (

                      <img

                        src={
                          previewImage
                        }

                        alt={
                          getFullName()
                        }

                        className="
                          h-full
                          w-full
                          object-cover
                        "
                      />

                    )
                    : (

                      <User

                        size={42}

                        strokeWidth={1.5}

                        className="
                          text-slate-400
                        "
                      />

                    )
                }

              </div>


              {/* Camera */}

              <button

                type="button"

                onClick={() =>
                  fileInputRef
                    .current
                    ?.click()
                }

                className="
                  absolute
                  bottom-0
                  right-0
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  border-2
                  border-white
                  bg-blue-600
                  text-white
                  shadow-md
                  transition
                  hover:bg-blue-700
                "

                title="
                  Change profile photo
                "
              >

                <Camera
                  size={17}
                />

              </button>


              <input

                ref={
                  fileInputRef
                }

                type="file"

                accept="image/*"

                onChange={
                  handleImageChange
                }

                className="hidden"
              />

            </div>


            {/* Name */}

            <div
              className="
                flex-1
              "
            >

              <h2
                className="
                  text-xl
                  font-bold
                  text-slate-800
                "
              >

                {
                  getFullName()
                }

              </h2>


              <div
                className="
                  mt-1
                  flex
                  items-center
                  gap-2
                  text-sm
                  text-slate-500
                "
              >

                {
                  isCompany
                    ? (

                      <Building2
                        size={16}
                      />

                    )
                    : (

                      <User
                        size={16}
                      />

                    )
                }


                <span>

                  {
                    isCompany
                      ? "Company Customer"
                      : "Customer"
                  }

                </span>

              </div>


              {
                isEditing
                &&
                (

                  <button

                    type="button"

                    onClick={() =>
                      fileInputRef
                        .current
                        ?.click()
                    }

                    className="
                      mt-3
                      inline-flex
                      items-center
                      gap-2
                      text-sm
                      font-semibold
                      text-blue-600
                      hover:text-blue-700
                    "
                  >

                    <Camera
                      size={16}
                    />

                    Change Photo

                  </button>

                )
              }

            </div>

          </div>

        </div>


        {/* ==============================================
            PERSONAL / COMPANY INFORMATION
        ============================================== */}

        <section
          className="mb-6"
        >

          <div
            className="mb-3"
          >

            <h2
              className="
                text-lg
                font-bold
                text-[#08295C]
              "
            >

              {
                isCompany
                  ? "Company Information"
                  : "Personal Information"
              }

            </h2>

          </div>


          {
            isCompany
              ? (

                <CompanyInfo

                  profile={
                    profile
                  }

                  formData={
                    formData
                  }

                  isEditing={
                    isEditing
                  }

                  onInputChange={
                    handleInputChange
                  }

                />

              )
              : (

                <PersonalInfo

                  profile={
                    profile
                  }

                  formData={
                    formData
                  }

                  isEditing={
                    isEditing
                  }

                  onInputChange={
                    handleInputChange
                  }

                />

              )
          }


          {/* ============================================
              ACTION BUTTONS
          ============================================ */}

          <div
            className="
              mt-6
              flex
              justify-end
              gap-3
            "
          >

            {
              !isEditing
                ? (

                  <button

                    type="button"

                    onClick={
                      handleEdit
                    }

                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-blue-600
                      px-6
                      py-3
                      text-sm
                      font-semibold
                      text-white
                      shadow-sm
                      transition
                      hover:bg-blue-700
                    "
                  >

                    Edit Profile

                  </button>

                )
                : (
                  <>

                    <button

                      type="button"

                      onClick={
                        handleCancel
                      }

                      disabled={
                        isSaving
                      }

                      className="
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-6
                        py-3
                        text-sm
                        font-semibold
                        text-slate-600
                        transition
                        hover:bg-slate-50
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >

                      Cancel

                    </button>


                    <button

                      type="button"

                      onClick={
                        handleSave
                      }

                      disabled={
                        isSaving
                      }

                      className="
                        rounded-xl
                        bg-blue-600
                        px-6
                        py-3
                        text-sm
                        font-semibold
                        text-white
                        shadow-sm
                        transition
                        hover:bg-blue-700
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    >

                      {
                        isSaving
                          ? "Saving..."
                          : "Save Changes"
                      }

                    </button>

                  </>
                )
            }

          </div>

        </section>


        {/* ==============================================
            SECURITY
        ============================================== */}

        <section>

          <div
            className="
              mb-3
              flex
              items-center
              gap-2
            "
          >

            <ShieldCheck

              size={20}

              className="
                text-[#08295C]
              "
            />


            <h2
              className="
                text-lg
                font-bold
                text-[#08295C]
              "
            >

              Security

            </h2>

          </div>


          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >


            {/* Password */}

            <SecurityRow

              label="Password"

              action="Change"

              onClick={() => {

                // Existing password change
                // route can be connected here later.

              }}

            />


            {/* ==========================================
                TRANSACTION PIN - FORGOT PIN
            ========================================== */}

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

            />


            {/* MFA */}

            <div
              className="
                flex
                items-center
                justify-between
                px-6
                py-5
              "
            >

              <div>

                <p
                  className="
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >

                  MFA (Email OTP)

                </p>


                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >

                  Multi-factor authentication

                </p>

              </div>


              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-emerald-50
                  px-3
                  py-1.5
                  text-xs
                  font-bold
                  text-emerald-600
                "
              >

                <span
                  className="
                    h-2
                    w-2
                    rounded-full
                    bg-emerald-500
                  "
                />

                Enabled

              </div>

            </div>

          </div>

        </section>

      </div>

    </div>

  );

}


/* =========================================================
   SECURITY ROW
========================================================= */

interface SecurityRowProps {

  label:
    string;

  action:
    string;

  onClick:
    () => void;

}


function SecurityRow({

  label,

  action,

  onClick,

}: SecurityRowProps) {

  return (

    <div
      className="
        flex
        items-center
        justify-between
        border-b
        border-slate-100
        px-6
        py-5
        last:border-b-0
      "
    >

      <div>

        <p
          className="
            text-sm
            font-semibold
            text-slate-700
          "
        >

          {label}

        </p>

      </div>


      <button

        type="button"

        onClick={
          onClick
        }

        className="
          text-sm
          font-semibold
          text-blue-600
          transition
          hover:text-blue-700
        "
      >

        {action} →

      </button>

    </div>

  );

}