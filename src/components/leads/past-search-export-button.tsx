"use client";

import { useState } from "react";
import { Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  STANDARD_EXPORT_HEADERS,
  generateCsvContent,
  formatLeadRowForExport,
} from "@/server/providers/leads/export-helpers";

interface PastSearchExportButtonProps {
  leads: any[];
  searchTitle?: string;
  source?: string;
}

export function PastSearchExportButton({
  leads,
  searchTitle = "leads",
  source = "search",
}: PastSearchExportButtonProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (!leads || leads.length === 0) return;
    const rows = leads.map(formatLeadRowForExport);
    const csvContent = generateCsvContent(STANDARD_EXPORT_HEADERS, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanTitle = searchTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    link.download = `leads-${source}-${leads.length}-${cleanTitle}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleDownload}
      disabled={!leads || leads.length === 0}
      icon={downloaded ? <Check size={13} className="text-success" /> : <Download size={13} />}
      title="Download CSV spreadsheet of these leads"
    >
      {downloaded ? "Downloaded!" : `Download CSV (${leads.length})`}
    </Button>
  );
}
