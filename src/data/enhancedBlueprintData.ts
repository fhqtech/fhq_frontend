// Enhanced blueprint data based on the sample JSON structure

import { EnhancedBlueprintData } from '@/types/blueprintTypes';

export const enhancedMockBlueprintData: EnhancedBlueprintData = {
  role_summary: {
    mission: "To meticulously manage and execute end-to-end accounting operations, ensuring the integrity and compliance of financial reporting, and providing actionable financial insights to support business objectives.",
    key_responsibilities: [
      "Prepare and finalize accurate financial statements in accordance with relevant accounting standards.",
      "Maintain and reconcile the general ledger, overseeing month-end and year-end closing processes.",
      "Ensure strict adherence to statutory and tax compliance requirements, including filings and reconciliations.",
      "Conduct comprehensive financial analysis, budgeting, and forecasting to inform strategic decisions.",
      "Support internal and external audits, and proactively identify and implement improvements in internal controls and processes."
    ],
    team_structure: "Operates within the finance department, collaborating with various internal stakeholders and external auditors/tax advisors."
  },
  evaluation_pillars: [
    {
      pillar_name: "Core Accounting & Reporting",
      description: "Fundamental competencies in managing financial records and generating accurate financial reports.",
      evaluation_criteria: [
        {
          skill_name: "Financial Statement Preparation & Finalization",
          context: "Core responsibility ensuring accurate external and internal financial reporting.",
          required_proficiency: "Expert",
          interview_focus_areas: [
            "Application of IFRS/GAAP principles to complex scenarios",
            "Consolidation principles for multi-entity structures",
            "Detailed understanding of cash flow statement preparation (direct vs. indirect)",
            "Key disclosure requirements and notes to financial statements"
          ],
          integrates_with: [
            "General Ledger Management",
            "Month-End & Year-End Closing Cycles",
            "Fundamental Accounting Principles (GAAP/IFRS)",
            "Local Accounting Standards",
            "ERP Systems",
            "Accounting Software"
          ]
        },
        {
          skill_name: "General Ledger Management",
          context: "The foundation for all accounting records and financial data integrity.",
          required_proficiency: "Hands-On Experience",
          interview_focus_areas: [
            "Chart of accounts design and maintenance for scalability",
            "Complex journal entry processing and approvals",
            "Automated vs. manual account reconciliation processes",
            "Handling suspense accounts and intercompany transactions",
            "Period-end closing journal entries (accruals, deferrals)"
          ],
          integrates_with: [
            "Financial Statement Preparation & Finalization",
            "Month-End & Year-End Closing Cycles",
            "ERP Systems",
            "Accounting Software"
          ]
        },
        {
          skill_name: "Month-End & Year-End Closing Cycles",
          context: "Critical process for timely and accurate periodic financial reporting.",
          required_proficiency: "Hands-On Experience",
          interview_focus_areas: [
            "Streamlining closing processes for efficiency",
            "Managing accruals, deferrals, and provisions",
            "Ensuring proper cut-off procedures and revenue recognition",
            "Variance analysis between actuals and budget/prior periods",
            "Reconciliation of balance sheet accounts and sub-ledgers"
          ],
          integrates_with: [
            "Financial Statement Preparation & Finalization",
            "General Ledger Management",
            "Fundamental Accounting Principles (GAAP/IFRS)",
            "ERP Systems",
            "Accounting Software"
          ]
        }
      ]
    },
    {
      pillar_name: "Compliance & Controls",
      description: "Expertise in navigating regulatory requirements, managing audits, and establishing robust internal control environments.",
      evaluation_criteria: [
        {
          skill_name: "Statutory & Tax Compliance",
          context: "Essential for legal and regulatory adherence, avoiding penalties.",
          required_proficiency: "Hands-On Experience",
          interview_focus_areas: [
            "Comprehensive knowledge of VAT/GST, corporate income tax, payroll taxes",
            "Process for preparing and filing various tax returns",
            "Managing tax provisions and deferred tax calculations",
            "Experience with tax reconciliations and managing tax audits",
            "Interaction with tax authorities and external advisors"
          ],
          integrates_with: [
            "Financial Statement Preparation & Finalization",
            "Local Accounting Standards",
            "ERP Systems",
            "Accounting Software"
          ]
        },
        {
          skill_name: "Internal & External Audit Support",
          context: "Facilitates transparent financial reporting and provides assurance to stakeholders.",
          required_proficiency: "Hands-On Experience",
          interview_focus_areas: [
            "Preparing detailed audit schedules and documentation packages",
            "Effectively responding to auditor queries and managing information flow",
            "Understanding audit materiality and risk assessment",
            "Experience with different types of audits (financial, operational)",
            "Implementing audit recommendations and remediation plans"
          ],
          integrates_with: [
            "Financial Statement Preparation & Finalization",
            "General Ledger Management",
            "Internal Controls & Process Improvements"
          ]
        }
      ]
    },
    {
      pillar_name: "Financial Analysis & Systems",
      description: "Ability to leverage financial data for insights, planning, and effective use of business tools.",
      evaluation_criteria: [
        {
          skill_name: "Advanced Spreadsheet Functions",
          context: "Ubiquitous tool for detailed analysis, reconciliations, and ad-hoc reporting.",
          required_proficiency: "Expert",
          interview_focus_areas: [
            "Mastery of PivotTables, VLOOKUP/XLOOKUP, INDEX/MATCH, SUMIFS/COUNTIFS",
            "Use of financial functions (e.g., NPV, IRR, PMT)",
            "Data validation, conditional formatting, and error handling",
            "Developing and auditing complex financial models",
            "Basic understanding or experience with Macros (VBA) for automation"
          ],
          integrates_with: [
            "Financial Analysis",
            "Budgeting & Forecasting"
          ]
        },
        {
          skill_name: "ERP Systems",
          context: "Central system for managing financial data and core accounting operations.",
          required_proficiency: "Operational Experience",
          interview_focus_areas: [
            "Navigation and data extraction across key modules (GL, AP, AR, FA)",
            "Generating standard and custom financial reports",
            "Understanding of master data management within the ERP",
            "Experience with transaction processing workflows and approvals",
            "User access controls and segregation of duties within the ERP environment"
          ],
          integrates_with: [
            "General Ledger Management",
            "Financial Statement Preparation & Finalization",
            "Month-End & Year-End Closing Cycles",
            "Statutory & Tax Compliance"
          ]
        },
        {
          skill_name: "Financial Analysis",
          context: "Provides valuable insights for business performance evaluation and strategic decision-making.",
          required_proficiency: "Hands-On Experience",
          interview_focus_areas: [
            "Conducting ratio analysis (liquidity, solvency, profitability, efficiency)",
            "Performing trend analysis and identifying key performance indicators (KPIs)",
            "In-depth variance analysis (actual vs. budget, prior year)",
            "Cost-benefit analysis and profitability by product/service line",
            "Working capital management and cash flow optimization"
          ],
          integrates_with: [
            "Financial Statement Preparation & Finalization",
            "Budgeting & Forecasting",
            "Advanced Spreadsheet Functions"
          ]
        }
      ]
    }
  ],
  qualifying_questions: [
    "Describe your experience leading or significantly contributing to month-end and year-end closing cycles. What specific challenges did you face, and how did you resolve them?",
    "Can you provide a detailed example of how you've used advanced spreadsheet functions or an ERP system to streamline a complex accounting process or perform in-depth financial analysis?",
    "How do you ensure continuous compliance with both fundamental accounting principles (like GAAP/IFRS) and specific local tax/statutory requirements in your daily work? Illustrate with an example."
  ],
  ideal_candidate_profile: "A meticulous and technically proficient Accountant with end-to-end expertise in core financial operations, including robust experience in financial statement preparation, general ledger management, and closing cycles. This candidate possesses a strong grasp of fundamental accounting principles and local compliance standards, coupled with practical skills in ERP systems, advanced spreadsheets, and financial analysis. They are proactive in strengthening internal controls, driving process improvements, and are adept at supporting audit processes while providing valuable financial insights to inform strategic decisions."
};