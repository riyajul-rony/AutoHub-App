"use client";

import React, { useState, useEffect } from "react";
import { FileSpreadsheet, RefreshCw, AlertCircle, Check, ExternalLink, Link2 } from "lucide-react";
import { ColumnMappingState } from "./csv-importer";

interface GoogleSheetImporterProps {
  onValidated: (result: {
    recipients: any[];
    summary: {
      total: number;
      valid: number;
      duplicates: number;
      suppressed: number;
      invalidSyntax: number;
    };
    preview: any[];
    sheetTitle: string;
    spreadsheetId: string;
  }) => void;
  isProcessing?: boolean;
}

interface GoogleSheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

function autoDetectMapping(headers: string[]): ColumnMappingState {
  const mapping: ColumnMappingState = {
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    website: "",
    job_title: "",
  };

  for (const h of headers) {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "_");

    if (!mapping.email && /^(email|e_mail|mail|contact_email|business_email)$/.test(clean)) {
      mapping.email = h;
    } else if (!mapping.first_name && /^(first_name|firstname|fname|first)$/.test(clean)) {
      mapping.first_name = h;
    } else if (!mapping.last_name && /^(last_name|lastname|lname|last)$/.test(clean)) {
      mapping.last_name = h;
    } else if (!mapping.first_name && /^(name|full_name|fullname|contact_name|person)$/.test(clean)) {
      mapping.first_name = h;
    } else if (!mapping.company && /^(company|company_name|business|organization|firm|employer)$/.test(clean)) {
      mapping.company = h;
    } else if (!mapping.website && /^(website|url|domain|web|site)$/.test(clean)) {
      mapping.website = h;
    } else if (!mapping.job_title && /^(job_title|title|role|position|occupation)$/.test(clean)) {
      mapping.job_title = h;
    }
  }

  if (!mapping.email) {
    const loose = headers.find((h) => h.toLowerCase().includes("email"));
    if (loose) mapping.email = loose;
  }

  return mapping;
}

export function GoogleSheetImporter({ onValidated, isProcessing }: GoogleSheetImporterProps) {
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<GoogleSheetFile[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [customUrlOrId, setCustomUrlOrId] = useState("");
  const [useCustomUrl, setUseCustomUrl] = useState(false);

  // Sheet Data
  const [readingSheet, setReadingSheet] = useState(false);
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [sheetTitle, setSheetTitle] = useState("");
  const [mapping, setMapping] = useState<ColumnMappingState>({
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    website: "",
    job_title: "",
  });

  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchGoogleFiles();
  }, []);

  const fetchGoogleFiles = async () => {
    setLoadingFiles(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/integrations/google-sheets/files");
      const json = await res.json();
      if (res.ok && json.data) {
        setConnected(Boolean(json.data.connected));
        setGoogleEmail(json.data.email || null);
        setFiles(json.data.files || []);
        if (json.data.files?.length > 0) {
          setSelectedSheetId(json.data.files[0].id);
        }
      }
    } catch {
      setErrorMsg("Failed to check Google Sheets connection status.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleReadSheet = async (targetId: string, tabName?: string) => {
    if (!targetId) {
      setErrorMsg("Please select or enter a Google Sheet.");
      return;
    }

    setReadingSheet(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/integrations/google-sheets/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetIdOrUrl: targetId,
          sheetName: tabName,
          maxRows: 500,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to read Google Sheet.");
      }

      const selectedFile = files.find((f) => f.id === targetId);
      const title = selectedFile?.name || "Google Sheet " + targetId.slice(0, 8);
      setSheetTitle(title);

      setTabs(json.data.sheets || []);
      setActiveTab(json.data.activeSheet || "");
      setHeaders(json.data.headers || []);
      setRows(json.data.rows || []);

      const guessed = autoDetectMapping(json.data.headers || []);
      setMapping(guessed);

      if (guessed.email && json.data.rows?.length > 0) {
        triggerValidation(json.data.rows, guessed, title, json.data.spreadsheetId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Could not read sheet data.");
    } finally {
      setReadingSheet(false);
    }
  };

  const triggerValidation = async (
    targetRows: Array<Record<string, string>>,
    currentMapping: ColumnMappingState,
    title: string,
    spreadsheetId: string
  ) => {
    if (!currentMapping.email) {
      setErrorMsg("Please select which column contains the Email address.");
      return;
    }

    setValidating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/outreach/recipients/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "sheet",
          rawRows: targetRows,
          mapping: currentMapping,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to validate sheet recipients.");
      }

      onValidated({
        recipients: json.data.validRecipients,
        summary: json.data.summary,
        preview: json.data.preview,
        sheetTitle: title,
        spreadsheetId,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error validating leads.");
    } finally {
      setValidating(false);
    }
  };

  if (loadingFiles) {
    return (
      <div className="p-8 rounded-2xl bg-surface/30 border border-border text-center text-xs text-muted flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-brand" />
        Checking Google Sheets connection...
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="p-8 rounded-2xl bg-surface/40 border border-border text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold">Google Account Not Connected</h4>
        <p className="text-xs text-muted max-w-sm mx-auto">
          Connect your Google account to select and import lead spreadsheets directly from your Google Drive.
        </p>
        <div className="pt-2">
          <a
            href="/api/v1/auth/google/start?state=outreach_sheets"
            className="btn btn-primary text-xs inline-flex items-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Connect Google Sheets
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connected Header */}
      <div className="p-4 rounded-2xl bg-surface/50 border border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-green/10 text-accent-green flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold flex items-center gap-1.5">
              <span>Google Sheets Connected</span>
              <span className="badge text-[10px] border-accent-green/40 text-accent-green">Active</span>
            </div>
            <div className="text-[11px] text-muted">
              {googleEmail || "Google Account"} • {files.length} spreadsheet(s) found in Drive
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchGoogleFiles}
          className="btn btn-ghost text-xs text-muted hover:text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Sheets
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sheet Selector */}
      <div className="border border-border/80 rounded-2xl p-4 bg-surface/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Select Spreadsheet</label>
          <button
            type="button"
            onClick={() => setUseCustomUrl(!useCustomUrl)}
            className="text-[11px] text-brand hover:underline flex items-center gap-1"
          >
            <Link2 className="w-3 h-3" />
            {useCustomUrl ? "Pick from Drive list" : "Paste Sheet URL directly"}
          </button>
        </div>

        {useCustomUrl ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrlOrId}
              onChange={(e) => setCustomUrlOrId(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
              className="input flex-1 text-xs"
            />
            <button
              type="button"
              disabled={readingSheet || !customUrlOrId.trim()}
              onClick={() => handleReadSheet(customUrlOrId.trim())}
              className="btn btn-primary text-xs"
            >
              {readingSheet ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Load Sheet"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={selectedSheetId}
              onChange={(e) => setSelectedSheetId(e.target.value)}
              className="input flex-1 text-xs"
            >
              {files.length === 0 ? (
                <option value="">No Google Sheets found in your Drive</option>
              ) : (
                files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.modifiedTime ? `(Updated ${new Date(f.modifiedTime).toLocaleDateString()})` : ""}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              disabled={readingSheet || !selectedSheetId}
              onClick={() => handleReadSheet(selectedSheetId)}
              className="btn btn-primary text-xs"
            >
              {readingSheet ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Load Data"}
            </button>
          </div>
        )}

        {/* Tab Selector if multiple tabs */}
        {tabs.length > 1 && (
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-muted">Sheet Tab:</span>
            <div className="flex flex-wrap gap-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    handleReadSheet(useCustomUrl ? customUrlOrId.trim() : selectedSheetId, tab);
                  }}
                  className={`btn text-[11px] py-1 px-2.5 ${
                    activeTab === tab ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visual Column Mapper */}
      {headers.length > 0 && (
        <div className="border border-border/80 rounded-2xl p-4 bg-surface/40 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-foreground">
                Map Columns for: <span className="text-brand">{sheetTitle}</span>
              </h4>
              <p className="text-[11px] text-muted">
                {rows.length} rows loaded. Confirm which columns correspond to recipient fields.
              </p>
            </div>
            <button
              type="button"
              disabled={validating || isProcessing || !mapping.email}
              onClick={() =>
                triggerValidation(
                  rows,
                  mapping,
                  sheetTitle,
                  useCustomUrl ? customUrlOrId.trim() : selectedSheetId
                )
              }
              className="btn btn-primary text-xs"
            >
              {validating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Validating...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" /> Re-apply Mapping
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">
                Email Address <span className="text-danger">*</span>
              </label>
              <select
                value={mapping.email}
                onChange={(e) => {
                  const updated = { ...mapping, email: e.target.value };
                  setMapping(updated);
                  if (e.target.value) {
                    triggerValidation(
                      rows,
                      updated,
                      sheetTitle,
                      useCustomUrl ? customUrlOrId.trim() : selectedSheetId
                    );
                  }
                }}
                className={`input w-full text-xs ${!mapping.email ? "border-danger/60" : ""}`}
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">First Name / Name</label>
              <select
                value={mapping.first_name}
                onChange={(e) => {
                  const updated = { ...mapping, first_name: e.target.value };
                  setMapping(updated);
                  triggerValidation(
                    rows,
                    updated,
                    sheetTitle,
                    useCustomUrl ? customUrlOrId.trim() : selectedSheetId
                  );
                }}
                className="input w-full text-xs"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">Last Name</label>
              <select
                value={mapping.last_name}
                onChange={(e) => {
                  const updated = { ...mapping, last_name: e.target.value };
                  setMapping(updated);
                  triggerValidation(
                    rows,
                    updated,
                    sheetTitle,
                    useCustomUrl ? customUrlOrId.trim() : selectedSheetId
                  );
                }}
                className="input w-full text-xs"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">Company Name</label>
              <select
                value={mapping.company}
                onChange={(e) => {
                  const updated = { ...mapping, company: e.target.value };
                  setMapping(updated);
                  triggerValidation(
                    rows,
                    updated,
                    sheetTitle,
                    useCustomUrl ? customUrlOrId.trim() : selectedSheetId
                  );
                }}
                className="input w-full text-xs"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">Website URL</label>
              <select
                value={mapping.website}
                onChange={(e) => {
                  const updated = { ...mapping, website: e.target.value };
                  setMapping(updated);
                  triggerValidation(
                    rows,
                    updated,
                    sheetTitle,
                    useCustomUrl ? customUrlOrId.trim() : selectedSheetId
                  );
                }}
                className="input w-full text-xs"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted block mb-1">Job Title</label>
              <select
                value={mapping.job_title}
                onChange={(e) => {
                  const updated = { ...mapping, job_title: e.target.value };
                  setMapping(updated);
                  triggerValidation(
                    rows,
                    updated,
                    sheetTitle,
                    useCustomUrl ? customUrlOrId.trim() : selectedSheetId
                  );
                }}
                className="input w-full text-xs"
              >
                <option value="">-- None / Optional --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
