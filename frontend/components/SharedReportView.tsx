import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import DataTable from "./DataTable";
import { FileText, Globe } from "lucide-react";
import { getSharedReport } from "../lib/api";
import { Report } from "../types";

const SharedReportView = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchReport = async () => {
      try {
        const response = await getSharedReport(id);
        if (response.ok) {
          const data = await response.json();
          const mapped: Report = {
            id: String(data.id),
            name: data.name,
            data: data.data || [],
            createdBy: data.created_by_name,
            createdAt: data.created_at,
            isShared: data.is_shared,
            filters: data.filters,
            sorts: data.sorts,
          };
          setReport(mapped);
        } else {
          setError("Report not found or private");
        }
      } catch (err) {
        setError("Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-textPrimary">
        <div className="text-center">Loading report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-textPrimary">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Report Not Found</h1>
          <p className="text-textSecondary">
            The report you are looking for does not exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Minimal Header */}
      <div className="flex items-center px-8 py-3 border-b border-border bg-reports-bg text-sm font-mono text-textSecondary gap-2">
        <span>reports</span>
        <span>/</span>
        <span>{(report as any).createdBy || "User"}</span>
        <span>/</span>
        <span>{(report as any).id}</span>
        <span>/</span>
        <span>{new Date((report as any).createdAt).toLocaleDateString()}</span>
        <span className="text-textPrimary ml-1">
          [{(report as any).data?.length || 0}]
        </span>
        <span className="text-xs bg-orange-500/20 px-2 py-0.5 rounded-full text-orange-500 border border-orange-500/30 font-semibold tracking-wider ml-4">
          BETA Feature
        </span>
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <DataTable
          data={report.data}
          type="person"
          title={report.name}
          reportMode={true}
        />
      </div>

      {/* Branded Footer */}
      <div className="px-8 py-4 border-t border-border bg-reports-bg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-textPrimary rounded-sm text-black flex items-center justify-center text-xs font-bold">
            F
          </div>
          <span className="text-sm font-semibold text-textPrimary">
            FounderStack CRM
          </span>
        </div>
        <p className="text-xs text-textSecondary font-medium">
          © {new Date().getFullYear()} FounderStack. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SharedReportView;
