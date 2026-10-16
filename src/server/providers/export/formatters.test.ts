import { describe, it, expect } from "vitest";
import { formatTsv, formatCsvWithBom } from "./formatters";

describe("Leads export formatters", () => {
  const sample = [
    {
      company_name: "Rahim Dental Care",
      email: "info@rahim.bd",
      email_type: "role",
      phone: "+8801711234567",
      website: "https://rahim.bd",
      rating: 4.9,
      reviews_count: 54,
      city: "Dhaka",
    },
  ];

  it("exports TSV with tab delimiters", () => {
    const tsv = formatTsv(sample);
    expect(tsv).toContain("Rahim Dental Care");
    expect(tsv.split("\n")[0]).toContain("Company\tEmail");
    expect(tsv).toContain("\tinfo@rahim.bd\t");
  });

  it("exports CSV with UTF-8 BOM byte marker at start", () => {
    const csv = formatCsvWithBom(sample);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Rahim Dental Care"');
    expect(csv).toContain('"info@rahim.bd"');
  });
});
