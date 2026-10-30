import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeEmail,
  splitFullName,
  validateAndNormalizeRecipients,
} from "./recipient-importer";
import { db } from "@/server/db";

describe("Phase 3: Recipient Importer, Deduplication & Suppression Filter", () => {
  const userId = "user-test-uuid";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes messy email inputs properly", () => {
    expect(normalizeEmail("   JOHN.DOE@GMAIL.COM  ")).toBe("john.doe@gmail.com");
    expect(normalizeEmail('<"Sarah.Connor@Cyberdyne.io">')).toBe("sarah.connor@cyberdyne.io");
    expect(normalizeEmail("")).toBe("");
    expect(normalizeEmail(null)).toBe("");
  });

  it("splits full names into first and last names", () => {
    expect(splitFullName("Alex Johnson")).toEqual({ firstName: "Alex", lastName: "Johnson" });
    expect(splitFullName("Madonna")).toEqual({ firstName: "Madonna", lastName: "" });
    expect(splitFullName("Dr. Gregory House M.D.")).toEqual({
      firstName: "Dr.",
      lastName: "Gregory House M.D.",
    });
    expect(splitFullName("   ")).toEqual({ firstName: "", lastName: "" });
  });

  it("validates, deduplicates, and filters suppressed emails accurately", async () => {
    // Mock db.suppressions to simulate an existing unsubscribed lead
    const mockFindMany = vi.spyOn(db.suppressions, "findMany").mockResolvedValue([
      {
        id: "sup-1",
        user_id: userId,
        email: "unsubscribed@badleads.com",
        reason: "unsubscribed",
        source_campaign_id: null,
        created_at: new Date(),
      } as any,
    ]);

    const rawRows = [
      // 1. Valid unique lead
      {
        "Work Email": "lead1@acme.com",
        "Full Name": "Alice Smith",
        "Company Name": "Acme Corp",
        Website: "acme.com",
        Niche: "Software",
      },
      // 2. Duplicate of lead 1 (should be skipped)
      {
        "Work Email": "  LEAD1@ACME.COM  ",
        "Full Name": "Alice S.",
        "Company Name": "Acme",
        Website: "acme.com",
      },
      // 3. Suppressed lead (should be filtered)
      {
        "Work Email": "unsubscribed@badleads.com",
        "Full Name": "Bob Unsub",
        "Company Name": "Bad Leads",
        Website: "badleads.com",
      },
      // 4. Invalid email syntax (should be skipped)
      {
        "Work Email": "not-an-email-at-all",
        "Full Name": "Charlie Broken",
        "Company Name": "Broken Inc",
      },
      // 5. Another valid lead with separate first/last name
      {
        "Work Email": "david@tech.io",
        "First Name": "David",
        "Last Name": "Miller",
        "Company Name": "Tech IO",
        Website: "tech.io",
      },
    ];

    const mapping = {
      email: "Work Email",
      full_name: "Full Name",
      first_name: "First Name",
      last_name: "Last Name",
      company: "Company Name",
      website: "Website",
    };

    const result = await validateAndNormalizeRecipients(userId, rawRows, mapping);

    // Verify summary
    expect(result.summary.total).toBe(5);
    expect(result.summary.valid).toBe(2);
    expect(result.summary.duplicates).toBe(1);
    expect(result.summary.suppressed).toBe(1);
    expect(result.summary.invalidSyntax).toBe(1);

    // Verify valid recipients
    expect(result.validRecipients).toHaveLength(2);
    expect(result.validRecipients[0].email).toBe("lead1@acme.com");
    expect(result.validRecipients[0].name).toBe("Alice Smith");
    expect(result.validRecipients[0].company).toBe("Acme Corp");
    // Custom variable extracted
    expect(result.validRecipients[0].vars?.Niche).toBe("Software");

    expect(result.validRecipients[1].email).toBe("david@tech.io");
    expect(result.validRecipients[1].first_name).toBe("David");
    expect(result.validRecipients[1].last_name).toBe("Miller");

    // Verify preview items
    expect(result.preview).toHaveLength(5);
    const statuses = result.preview.map((p) => p.status);
    expect(statuses).toContain("ready");
    expect(statuses).toContain("duplicate");
    expect(statuses).toContain("suppressed");
    expect(statuses).toContain("invalid_syntax");

    mockFindMany.mockRestore();
  });
});
