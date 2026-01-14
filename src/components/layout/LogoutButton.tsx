"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer p-2"
    >
      <i className="fa-solid fa-power-off text-sm"></i>
    </button>
  );
}
