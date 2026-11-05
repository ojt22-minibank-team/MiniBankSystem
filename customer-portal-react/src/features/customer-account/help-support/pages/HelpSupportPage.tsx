import { Link } from "react-router-dom";
import { useState } from "react";

import HelpCenterHero from "../components/HelpCenterHero";
import FAQSection from "../components/FAQSection";
import AboutMiniBank from "../components/AboutMiniBank";

const HelpSupportPage = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <Link
          to="/dashboard"
          className="text-slate-500 transition-colors hover:text-[#00A3C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3C4]"
        >
          Dashboard
        </Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="text-[#00A3C4]" aria-current="page">Help & Support</span>
      </nav>

      <HelpCenterHero
        search={search}
        onSearchChange={setSearch}
      />

      <FAQSection search={search} />

      <AboutMiniBank />

    </div>
  );
};

export default HelpSupportPage;