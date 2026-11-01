import { useState } from "react";

import HelpCenterHero from "../components/HelpCenterHero";
import FAQSection from "../components/FAQSection";
import AboutMiniBank from "../components/AboutMiniBank";

const HelpSupportPage = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-2 px-4 py-6 sm:px-6 lg:px-8">

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