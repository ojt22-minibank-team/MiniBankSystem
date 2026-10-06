import {
  Headphones,
  Landmark,
  ShieldCheck,
} from "lucide-react";


function PublicAuthHeader() {

  return (

    <header className="border-b border-slate-200 bg-white">

      <div className="
        mx-auto
        flex
        min-h-[72px]
        w-full
        max-w-[1450px]
        items-center
        justify-between
        px-5
        md:px-8
      ">

        {/* BRAND */}

        <div className="flex items-center gap-3">

          <div className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            bg-[#08295C]
            text-white
            shadow-sm
          ">

            <Landmark size={23} />

          </div>


          <div>

            <h1 className="
              text-xl
              font-bold
              text-[#08295C]
            ">
              MiniBank
            </h1>

            <p className="
              mt-0.5
              text-xs
              text-slate-400
            ">
              Customer Portal
            </p>

          </div>

        </div>


        {/* RIGHT SIDE */}

        <div className="flex items-center gap-6">

          <div className="
            hidden
            items-center
            gap-2
            text-sm
            font-semibold
            text-emerald-600
            md:flex
          ">

            <ShieldCheck size={18} />

            Secure Banking

          </div>


          <button
            type="button"
            className="
              flex
              items-center
              gap-2
              text-sm
              font-semibold
              text-blue-600
              transition
              hover:text-blue-700
            "
          >

            <Headphones size={18} />

            <span className="hidden sm:inline">
              Help & Support
            </span>

          </button>

        </div>

      </div>

    </header>

  );

}


export default PublicAuthHeader;