/**
 * Finance sub-domain taxonomy — frontend mirror of
 * shared/finance_taxonomy.py on the backend. Keep in sync manually.
 *
 * Used in:
 *  - CreateInterview Step 0 — two-tier domain selector
 *  - Dashboard skill-gap filter (Phase B)
 *  - Anywhere we render a domain or sub-domain label
 */

export type FinanceDomainId = "accounting" | "taxation" | "consulting";

export interface FinanceDomainSpec {
  label: string;
  sub: string[];
}

export const FINANCE_DOMAINS: Record<FinanceDomainId, FinanceDomainSpec> = {
  accounting: {
    label: "Accounting",
    sub: ["Financial reporting", "Audit", "Controllership"],
  },
  taxation: {
    label: "Taxation",
    sub: ["Direct tax", "Indirect tax / GST", "Transfer pricing"],
  },
  consulting: {
    label: "Management consulting",
    sub: ["Transaction services", "Risk advisory", "Strategy"],
  },
};

export const FINANCE_DOMAIN_IDS: FinanceDomainId[] = [
  "accounting",
  "taxation",
  "consulting",
];

export function isValidFinanceDomain(value: string | null | undefined): value is FinanceDomainId {
  return !!value && value in FINANCE_DOMAINS;
}

export function isValidSubDomain(
  domain: string | null | undefined,
  subDomain: string | null | undefined,
): boolean {
  if (!isValidFinanceDomain(domain) || !subDomain) return false;
  return FINANCE_DOMAINS[domain].sub.includes(subDomain);
}

export function getSubDomains(domain: string | null | undefined): string[] {
  if (!isValidFinanceDomain(domain)) return [];
  return FINANCE_DOMAINS[domain].sub;
}

export function getDomainLabel(domain: string | null | undefined): string | null {
  if (!isValidFinanceDomain(domain)) return null;
  return FINANCE_DOMAINS[domain].label;
}
