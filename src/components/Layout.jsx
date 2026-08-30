import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background paper-texture">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <MobileNav />
        <main className="flex-1 px-6 py-8 md:px-12 md:py-12 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
