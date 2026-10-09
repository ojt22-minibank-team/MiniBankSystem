import type {
  ReactNode,
} from "react";

import PublicAuthHeader
  from "./PublicAuthHeader";

import PublicAuthFooter
  from "./PublicAuthFooter";


interface PublicAuthLayoutProps {

  children: ReactNode;

}


function PublicAuthLayout({
  children,
}: PublicAuthLayoutProps) {

  return (

    <div className="
      flex
      min-h-screen
      flex-col
      bg-[#F3F7FB]
    ">

      <PublicAuthHeader />


      <main className="
        flex
        flex-1
        items-center
        justify-center
        px-4
        py-8
        md:px-8
      ">

        {children}

      </main>


      <PublicAuthFooter />

    </div>

  );

}


export default PublicAuthLayout;