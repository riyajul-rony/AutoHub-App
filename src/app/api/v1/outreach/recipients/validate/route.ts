import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { validateAndNormalizeRecipients, ColumnMapping } from "@/server/email/recipient-importer";
import { z } from "zod";

const validateRequestSchema = z.object({
  source: z.enum(["leads", "sheet", "csv"]),
  searchId: z.string().optional(),
  onlyWithEmail: z.boolean().optional().default(true),
  onlyEnriched: z.boolean().optional().default(false),
  rawRows: z.array(z.record(z.string(), z.any())).optional(),
  mapping: z
    .object({
      email: z.string(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      full_name: z.string().optional(),
      company: z.string().optional(),
      website: z.string().optional(),
      job_title: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = validateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid validation payload" },
      { status: 400 }
    );
  }

  const { source, searchId, onlyWithEmail, onlyEnriched, rawRows, mapping } = parsed.data;

  // Case 1: Saved Lead Searches
  if (source === "leads") {
    if (!searchId) {
      return NextResponse.json({ error: "searchId is required for leads source" }, { status: 400 });
    }

    const whereClause: any = scoped(session.user.id, { search_id: searchId });
    if (onlyWithEmail) {
      whereClause.email = { not: null };
    }
    if (onlyEnriched) {
      whereClause.status = { not: "new" };
    }

    const leads = await db.leads.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        full_name: true,
        company_name: true,
        website: true,
        phone_raw: true,
        phone_e164: true,
      },
      take: 2000,
    });

    const leadRows = leads.map((l: any) => ({
      email: l.email || "",
      first_name: l.first_name || "",
      last_name: l.last_name || "",
      full_name: l.full_name || "",
      company: l.company_name || "",
      website: l.website || "",
      phone: l.phone_e164 || l.phone_raw || "",
      lead_id: l.id,
    }));

    const result = await validateAndNormalizeRecipients(session.user.id, leadRows, {
      email: "email",
      first_name: "first_name",
      last_name: "last_name",
      full_name: "full_name",
      company: "company",
      website: "website",
      phone: "phone",
    });

    return NextResponse.json({ data: result });
  }

  // Case 2: CSV or Google Sheet
  if (!rawRows || !Array.isArray(rawRows)) {
    return NextResponse.json({ error: "rawRows array is required" }, { status: 400 });
  }

  if (!mapping || !mapping.email) {
    return NextResponse.json({ error: "A valid email column mapping is required" }, { status: 400 });
  }

  const result = await validateAndNormalizeRecipients(session.user.id, rawRows, mapping);
  return NextResponse.json({ data: result });
}
