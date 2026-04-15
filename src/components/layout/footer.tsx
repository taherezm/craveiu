import Link from "next/link";
import { Utensils } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Utensils className="h-4 w-4 text-[#990000]" />
          <span>
            <span className="font-semibold text-gray-700">CraveIU</span>
            {" "}— built for IU Bloomington students
          </span>
        </div>

        <nav className="flex items-center gap-6 text-sm text-gray-500">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-gray-900"
          >
            Dashboard
          </Link>
          <Link
            href="/preferences"
            className="transition-colors hover:text-gray-900"
          >
            Preferences
          </Link>
          <Link
            href="/about"
            className="transition-colors hover:text-gray-900"
          >
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
