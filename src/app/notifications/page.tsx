"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { DINING_HALLS } from "@/lib/constants";

interface FoodAlert {
  id: string;
  foodName: string;
  hallSlug: string | null; // null = any hall
  active: boolean;
  createdAt: string;
}

const STORAGE_KEY = "craveiu_alerts";

function loadAlerts(): FoodAlert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveAlerts(alerts: FoodAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

const COMMON_FOODS = [
  "chicken tenders", "burgers", "bacon", "pizza", "wings",
  "waffles", "pancakes", "mac and cheese", "cookies", "grilled chicken",
];

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<FoodAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [hallSlug, setHallSlug] = useState<string>("any");

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  function addAlert() {
    if (!foodName.trim()) return;
    const newAlert: FoodAlert = {
      id: crypto.randomUUID(),
      foodName: foodName.trim().toLowerCase(),
      hallSlug: hallSlug === "any" ? null : hallSlug,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...alerts, newAlert];
    setAlerts(updated);
    saveAlerts(updated);
    setFoodName("");
    setHallSlug("any");
    setShowForm(false);
  }

  function toggleAlert(id: string) {
    const updated = alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
    setAlerts(updated);
    saveAlerts(updated);
  }

  function deleteAlert(id: string) {
    const updated = alerts.filter((a) => a.id !== id);
    setAlerts(updated);
    saveAlerts(updated);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Food alerts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Get notified when your favourite food appears on the menu.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-full bg-[#990000] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#7a0000]"
        >
          <Plus className="h-4 w-4" />
          New alert
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">New food alert</h3>
            <button onClick={() => setShowForm(false)}>
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Food item
            </label>
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g. chicken tenders"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/10"
              onKeyDown={(e) => e.key === "Enter" && addAlert()}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COMMON_FOODS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFoodName(f)}
                  className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Hall (optional)
            </label>
            <select
              value={hallSlug}
              onChange={(e) => setHallSlug(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#990000]"
            >
              <option value="any">Any hall</option>
              {DINING_HALLS.map((h) => (
                <option key={h.slug} value={h.slug}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={addAlert}
            disabled={!foodName.trim()}
            className="w-full rounded-full bg-[#990000] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#7a0000] disabled:opacity-40"
          >
            Add alert
          </button>
        </div>
      )}

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No alerts yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            Add an alert to be notified when your favorite food is being served.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const hall = alert.hallSlug
              ? DINING_HALLS.find((h) => h.slug === alert.hallSlug)
              : null;
            return (
              <div
                key={alert.id}
                className={`flex items-center justify-between rounded-2xl border bg-white p-4 transition-all ${
                  alert.active ? "border-gray-100 shadow-sm" : "border-gray-100 opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${alert.active ? "bg-emerald-400" : "bg-gray-300"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">
                      {alert.foodName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {hall ? hall.name : "Any dining hall"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    className="text-gray-400 transition hover:text-gray-600"
                    title={alert.active ? "Pause alert" : "Resume alert"}
                  >
                    {alert.active ? (
                      <ToggleRight className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="text-gray-300 transition hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-gray-400">
        Push notifications coming soon — alerts check on page load for now.
      </p>
    </div>
  );
}
