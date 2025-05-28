"use client";

import MainLandingHero from "./_home/MainLandingHero";

export default function Home() {
  return (
    <main className="px-5 bg-gray-100 py-2 mobile-xl:px-10 mobile-xl:py-4 md:px-16 md:py-6 relative w-full flex flex-col flex-auto gap-y-4">
      <MainLandingHero />
    </main>
  );
}
