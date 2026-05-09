// Mock blueprint data based on sample JSON structure
export interface BlueprintData {
  evaluation_pillars: string[];
  ideal_candidate_profile: string;
  key_responsibilities: string; // JSON string array
  mission: string;
  qualifying_questions: string[];
}

export const mockBlueprintData: BlueprintData = {
  evaluation_pillars: [
    "Core Financial Operations & Reporting",
    "Compliance, Audit & Controls",
    "Financial Analysis & Systems Proficiency"
  ],
  ideal_candidate_profile: "A highly analytical and meticulously organized Accountant with a comprehensive understanding of end-to-end accounting operations, financial reporting, and compliance. This individual possesses a strong command of fundamental accounting principles, expert proficiency in ERP systems and advanced spreadsheets, and a proven track record in managing closing cycles, statutory filings, and supporting audits. They are proactive in identifying process improvements and contributing to financial analysis, budgeting, and forecasting, always prioritizing accuracy, control, and efficiency.",
  key_responsibilities: JSON.stringify([
    "Prepare and finalize comprehensive financial statements.",
    "Manage the general ledger and execute month-end/year-end closing cycles.",
    "Ensure compliance with all statutory and tax requirements, including filings and reconciliations.",
    "Utilize advanced spreadsheet functions and operate ERP/accounting software proficiently.",
    "Conduct financial analysis, budgeting, and forecasting activities.",
    "Support internal and external audits and implement internal control improvements."
  ]),
  mission: "To meticulously manage end-to-end accounting operations, ensuring the accuracy and integrity of financial records, adherence to accounting standards and tax regulations, and providing insightful financial analysis to support strategic decision-making.",
  qualifying_questions: [
    "Describe your experience managing a full month-end close cycle. What steps do you take to ensure accuracy and meet tight deadlines?",
    "Can you provide an example of how you've leveraged an ERP system or advanced spreadsheet functions to solve a complex accounting problem or improve a process?",
    "Walk me through your understanding of a key accounting standard (e.g., revenue recognition or lease accounting) and how you've applied it in practice.",
    "How do you approach ensuring compliance with local tax regulations, and what's your experience supporting external tax audits?"
  ]
};