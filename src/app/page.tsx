import Link from "next/link";
import { ArrowRight, Utensils, Zap, Bell, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white dark:bg-zinc-900 px-4 pb-24 pt-20 sm:pt-28">
        {/* Subtle background grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #990000 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-1.5 text-sm font-medium text-red-700 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Built for IU Bloomington students
          </div>
          <h1 className="animate-slide-up text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
            Skip the<br />
            <span className="text-[#990000]">menu hunt.</span>
          </h1>
          <p className="animate-slide-up delay-75 mx-auto mt-6 max-w-2xl text-xl text-gray-500 dark:text-zinc-500 sm:text-2xl">
            CraveIU tells you exactly where to eat at IU Bloomington
            based on what you&apos;re craving right now.
          </p>
          <div className="animate-slide-up delay-150 mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[#990000] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#7a0000] hover:shadow-xl active:scale-[0.98]"
            >
              Find my dining hall
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/preferences"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-8 py-4 text-base font-semibold text-gray-700 dark:text-zinc-200 transition-all hover:border-gray-300 dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              Set my cravings
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 py-4">
        <div className="mx-auto max-w-4xl overflow-hidden px-4">
          <p className="text-center text-sm text-gray-500 dark:text-zinc-500">
            Tracking menus across{" "}
            <span className="font-semibold text-gray-800 dark:text-zinc-100">5 IU dining halls</span>
            {" "}·{" "}
            <span className="font-semibold text-gray-800 dark:text-zinc-100">3 meal periods</span>
            {" "}·{" "}
            <span className="font-semibold text-gray-800 dark:text-zinc-100">updated daily</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            No more checking every menu
          </h2>
          <p className="mt-3 text-center text-lg text-gray-500 dark:text-zinc-500">
            One app. All halls. Ranked for what <em>you</em> want.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Instant rankings",
                body: "Halls are ranked in real time based on your saved food preferences.",
              },
              {
                icon: Utensils,
                title: "Save your cravings",
                body: "Tell us what you love, what you like, and what to avoid.",
              },
              {
                icon: Bell,
                title: "Food alerts",
                body: "Get notified the moment chicken tenders or bacon hits the menu.",
              },
              {
                icon: Star,
                title: "Why this hall?",
                body: "Every ranking comes with a plain-English explanation of exactly why.",
              },
            ].map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className={`animate-slide-up rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 p-6 delay-${i * 75}`}
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#990000]/10">
                  <Icon className="h-5 w-5 text-[#990000]" />
                </div>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Halls strip */}
      <section className="bg-gray-50 dark:bg-zinc-900 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            Dining halls tracked
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Collins Eatery",
              "Forest Dining Hall",
              "Goodbody Hall Eatery",
              "McNutt Dining Hall",
              "Wright Dining Hall",
            ].map((hall) => (
              <span
                key={hall}
                className="rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-200 shadow-sm"
              >
                {hall}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-[#990000] px-4 py-16 text-center text-white">
        <h2 className="text-3xl font-bold sm:text-4xl">
          What are you craving today?
        </h2>
        <p className="mt-3 text-red-200">
          Set your preferences once. Get personalized rankings every meal.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-[#990000] transition-all hover:bg-red-50 active:scale-[0.98]"
        >
          Open CraveIU <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
