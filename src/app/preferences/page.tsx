"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PreferenceForm } from "@/components/preferences/preference-form";

export default function PreferencesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 transition-colors hover:text-gray-800 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Your food preferences
        </h1>
        <p className="mt-2 text-gray-500 dark:text-zinc-400">
          Tell CraveIU what you like, what you love, and what to avoid. Your rankings update instantly.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm sm:p-8">
        <PreferenceForm />
      </div>

      <p className="mt-4 text-center text-xs text-gray-400 dark:text-zinc-500">
        Preferences are saved locally on your device.
      </p>
    </div>
  );
}
