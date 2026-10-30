"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, Check, AlertCircle, RefreshCw, X } from "lucide-react";

export interface ColumnMappingState {
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  website: string;
  job_title: string;
}

interface CsvImporterProps {
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
    fileName: string;
  }) => void;
  isProcessing?: boolean;
}

/**
 * Robust lightweight RFC-compliant CSV parser (no external library required)
 */
function parseCsvContent(text: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentToken = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentToken += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(currentToken.trim());
      currentToken = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(currentToken.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      currentToken = "";
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0 || row.length > 0) {
    row.push(currentToken.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = lines[0] || [];
  const headers = rawHeaders.map((h, i) => (h ? h.trim() : `Col_${i + 1}`));

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const record: Record<string, string> = {};
    let hasVal = false;
    for (let c = 0; c < headers.length; c++) {
      const val = line[c] || "";
      if (val) hasVal = true;
      record[headers[c]] = val;
    }
    if (hasVal) {
      rows.push(record);
    }
  }

  return { headers, rows };
}

/**
 * Intelligent guesser for column headers
 */
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

  // Fallback for email if not exact
  if (!mapping.email) {
    const loose = headers.find((h) => h.toLowerCase().includes("email"));
    if (loose) mapping.email = loose;
  }

  return mapping;
}

export function CsvImporter({ onValidated, isProcessing }: CsvImporterProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Array<Record<string, string>>>([]);
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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSampleLeads = () => {
    setErrorMsg(null);
    const sampleCsv = `email,first_name,last_name,company,website,job_title
sarah.connor@cyberdyne.io,Sarah,Connor,Cyberdyne Systems,cyberdyne.io,VP Operations
john.doe@acmedental.com,John,Doe,Acme Dental Clinic,acmedental.com,Lead Dentist
elena.rostova@nexusgrowth.com,Elena,Rostova,Nexus Growth,nexusgrowth.com,Managing Director`;

    const { headers: detectedHeaders, rows } = parseCsvContent(sampleCsv);
    setFileName("sample_demo_leads.csv");
    setHeaders(detectedHeaders);
    setParsedRows(rows);
    const guessed = autoDetectMapping(detectedHeaders);
    setMapping(guessed);
    if (guessed.email) {
      triggerValidation(rows, guessed, "sample_demo_leads.csv");
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMsg("Please upload a valid .csv file.");
      return;
    }

    setErrorMsg(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || "";
        const { headers: detectedHeaders, rows } = parseCsvContent(text);

        if (detectedHeaders.length === 0 || rows.length === 0) {
          setErrorMsg("The CSV file is empty or has no readable rows.");
          return;
        }

        setHeaders(detectedHeaders);
        setParsedRows(rows);

        const guessed = autoDetectMapping(detectedHeaders);
        setMapping(guessed);

        // Auto validate if email column found
        if (guessed.email) {
          triggerValidation(rows, guessed, file.name);
        }
      } catch (err: any) {
        setErrorMsg("Failed to read CSV: " + (err.message || "Unknown format error"));
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const triggerValidation = async (
    rows: Array<Record<string, string>>,
    currentMapping: ColumnMappingState,
    activeFileName: string
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
          source: "csv",
          rawRows: rows,
          mapping: currentMapping,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to validate recipients.");
      }

      onValidated({
        recipients: json.data.validRecipients,
        summary: json.data.summary,
        preview: json.data.preview,
        fileName: activeFileName,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error validating CSV leads.");
    } finally {
      setValidating(false);
    }
  };

  const resetFile = () => {
    setFileName(null);
    setHeaders([]);
    setParsedRows([]);
    setMapping({
      email: "",
      first_name: "",
      last_name: "",
      company: "",
      website: "",
      job_title: "",
    });
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!fileName ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? "border-brand bg-brand/10 scale-[0.99]"
              : "border-border/80 hover:border-brand/60 bg-surface/30 hover:bg-surface/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold mb-1">Click to upload or drag & drop CSV file</h4>
          <p className="text-xs text-muted max-w-sm mx-auto mb-3">
            Upload contact lists exported from Apollo, LinkedIn, CRM, or spreadsheets. Max 2,000 rows.
          </p>
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadSampleLeads();
              }}
              className="btn btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
            >
              <span>✨ Load Demo Sample Leads</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-surface/50 border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold">{fileName}</div>
              <div className="text-[11px] text-muted">
                {parsedRows.length} total rows detected • {headers.length} columns found
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={resetFile}
            className="btn btn-ghost text-xs text-muted hover:text-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Replace File
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Visual Column Mapper */}
      {headers.length > 0 && (
        <div className="border border-border/80 rounded-2xl p-4 bg-surface/40 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-foreground">Map CSV Columns to Lead Fields</h4>
              <p className="text-[11px] text-muted">
                Confirm which columns correspond to the recipient variables for your templates.
              </p>
            </div>
            <button
              type="button"
              disabled={validating || isProcessing || !mapping.email}
              onClick={() => triggerValidation(parsedRows, mapping, fileName || "leads.csv")}
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
                  if (e.target.value) triggerValidation(parsedRows, updated, fileName || "leads.csv");
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
                  triggerValidation(parsedRows, updated, fileName || "leads.csv");
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
                  triggerValidation(parsedRows, updated, fileName || "leads.csv");
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
                  triggerValidation(parsedRows, updated, fileName || "leads.csv");
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
                  triggerValidation(parsedRows, updated, fileName || "leads.csv");
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
                  triggerValidation(parsedRows, updated, fileName || "leads.csv");
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
