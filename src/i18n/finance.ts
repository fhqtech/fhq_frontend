/**
 * Finance-domain i18n constants (T4 of FlowDot AI repositioning).
 *
 * FlowDot AI today is finance-only. Every public-facing string that
 * references a domain, role, or example lives here so:
 *   1. We can swap the brand surface in one place when copy changes.
 *   2. Adding a second domain becomes a parallel `src/i18n/<domain>.ts`
 *      and a `useDomainStrings()` hook — no string-by-string rewrite.
 *
 * Do NOT add unrelated strings here. Layout chrome, button labels,
 * and other generic UI copy stays in their components.
 */

export const FINANCE_STRINGS = {
  // Brand surfaces — mirror funnelhq.co/
  brand: {
    tagline: 'Finance hiring, decided on depth. Not résumés.',
    subtagline: 'AI-native recruitment · Finance only · India',
    productName: 'TAG', // Talent Analysis Graph
    productNameFull: 'Talent Analysis Graph',
  },

  // Dashboard
  dashboard: {
    heroHeadline: 'Finance hiring, decided on depth.',
    heroSubcopy: 'Every candidate evaluated against a rubric built by Big-4 practitioners. A CV tells you a story. A TAG tells you the truth.',
    emptyState: {
      title: 'Your first TAG starts here',
      body: 'Add a finance role — Tax Manager, Financial Controller, FP&A Lead, M&A Analyst — and we’ll generate a 10-skill blueprint your candidates will be evaluated against.',
      cta: 'Add a finance role',
    },
  },

  // Create-interview wizard
  createInterview: {
    titlePlaceholder: 'e.g. Senior Tax Manager, Financial Controller, FP&A Lead',
    descriptionPlaceholder:
      'Describe the finance role: vertical (accounting / taxation / advisory), seniority, must-have technical depth, regulatory frameworks involved.',
    roleExamples: [
      'Financial Controller (Series B SaaS, 8-12 yrs)',
      'GST Specialist (compliance + litigation, 4-7 yrs)',
      'Transfer Pricing Manager (Big-4 alum preferred, 5-10 yrs)',
      'M&A Analyst (transaction services, 2-4 yrs)',
      'Forensic Risk Advisor (FRAUD investigations, 4-8 yrs)',
    ],
  },

  // Sidebar
  nav: {
    interviews: 'TAGs', // T4: rebrand the nav item — matches funnelhq.co's brand language
    interviewsSubtitle: 'Talent Analysis Graphs',
  },

  // Domain-aware empty / verification states
  validation: {
    nonFinanceRoleWarning:
      'FlowDot AI is calibrated for finance roles (accounting, taxation, management consulting). For tech, sales, or operations hires, the evaluation rubric will not produce reliable signal.',
  },
} as const;

export type FinanceStrings = typeof FINANCE_STRINGS;
