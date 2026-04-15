"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { DINING_HALLS } from "@/lib/constants";
import { formatTimeAgo } from "@/lib/utils";

interface AdminStatus {
  lastSync: string | null;
  sourceHealth: boolean;
  hallStatus: { hallName: string; itemCount: number; lastSync: string; confidence: number }[];
  recentLogs: { id: string; hallName: string; status: string; itemCount: number; error?: string; createdAt: string }[];
  avgConfidence: number;
  totalItems: number;
}

export default function AdminPage() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/admin");
      if (!res.ok) throw new Error("Failed to load admin status");
      setStatus(await res.json());
    } catch {
      // ignore for now
    } finally {
      setIsLoading(false);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      await fetch("/api/ingest", { method: "POST" });
      await fetchStatus();
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System status</h1>
          <p className="mt-1 text-sm text-gray-500">Ingestion health &amp; menu sync monitor.</p>
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-full bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5">
              <div className="h-4 w-40 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : status ? (
        <>
          {/* Summary cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-400">Source health</p>
              <div className="mt-2 flex items-center gap-2">
                {status.sourceHealth ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-semibold text-gray-800">
                  {status.sourceHealth ? "Healthy" : "Degraded"}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-400">Total items today</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{status.totalItems}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-400">Avg parse confidence</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {Math.round(status.avgConfidence * 100)}%
              </p>
            </div>
          </div>

          {/* Per-hall status */}
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Hall sync status</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {status.hallStatus.map((hall) => (
                <div key={hall.hallName} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{hall.hallName}</p>
                    <p className="text-xs text-gray-400">
                      Last sync: {hall.lastSync ? formatTimeAgo(new Date(hall.lastSync)) : "never"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">{hall.itemCount} items</p>
                    <p className="text-xs text-gray-400">
                      {Math.round(hall.confidence * 100)}% confidence
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent logs */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Recent ingestion logs</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {status.recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                  {log.status === "success" ? (
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : log.status === "partial" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{log.hallName}</p>
                    {log.error && (
                      <p className="mt-0.5 truncate text-xs text-red-500">{log.error}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-gray-600">{log.itemCount} items</p>
                    <p className="text-xs text-gray-400">
                      {formatTimeAgo(new Date(log.createdAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No status data available.</p>
        </div>
      )}
    </div>
  );
}
