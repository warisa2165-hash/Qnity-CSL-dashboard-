import type { WeeklyReport } from "@/lib/types";

export const weeklyReports: WeeklyReport[] = [
  {
    id: "wr-2026-31",
    weekNumber: 31,
    periodStart: "2026-07-27",
    periodEnd: "2026-08-02",
    publishedAt: "2026-08-01",
    preparedBy: "Warisa Kantifong",
    overallStatus: "YELLOW",
    overallProgress: 58,
    currentPhase: "Construction",
    keyAchievements: [
      "Exhaust duct hanger installation completed in zone C, ahead of the main duct run",
      "Ion Chromatography and FT230 confirmed shipped from origin",
      "Two-shift recovery plan agreed in principle with Design Alternative for a 10 Aug 2026 start",
      "Zero LTI maintained — 198 consecutive LTI-free days",
    ],
    activitiesCompleted: [
      "Partition framing and electrical first fix progressed in zones A and B",
      "Weekly joint safety inspection with the INC2 building EHS team",
      "Design coordination on cleanroom and gas system Rev.C scope",
      "Customs documentation pre-lodged for the Ion Chromatography shipment",
    ],
    safetySummary:
      "Safety score 94%. Zero LTI to date. One near miss (ladder movement) closed with reinforced controls. Three findings open, one overdue (temporary power distribution board). Eight toolbox talks delivered this month.",
    procurementSummary:
      "Procurement 71% complete. Nine of fourteen packages have a PO issued. SEM-EDS remains in commercial review and is the critical open item; the exhaust system and gas manifold packages are blocked by design Rev.C.",
    capexSummary:
      "Twelve CAPEX 2026 items tracked with a combined budget of THB 48.0M. Seven POs issued, one item delivered (polisher/grinder), two in shipping, three in manufacturing. SEM-EDS PO release is the single most critical CAPEX decision.",
    topRisks: [
      "R-01 SEM-EDS PO release — 30-week lead time threatens the handover date (CRITICAL)",
      "R-12 Commissioning window compresses below 4 weeks if mechanical completion slips (CRITICAL)",
      "R-02 Exhaust riser landlord endorsement outstanding (HIGH)",
      "R-03 Cleanroom and gas system design still in Rev.B (HIGH)",
      "R-04 Construction 41% against a 50% plan (HIGH)",
    ],
    openIssues: [
      "Temporary power distribution plan rejected and not resubmitted (overdue since 29 Jun 2026)",
      "Design Alternative site supervision below the contracted headcount for three weeks",
      "ICP-OES vendor data sheet outstanding, blocking the utility matrix",
      "Owner review of the week 30 construction progress report overdue",
    ],
    managementAttention: [
      "OA-01 Approve the SEM-EDS purchase order release by 08 Aug 2026",
      "OA-03 Endorse the two-shift construction recovery plan by 07 Aug 2026",
      "OA-04 Sponsor the landlord endorsement for the exhaust riser penetration",
      "OA-08 Confirm the EHS stop condition on temporary power before the second shift starts",
    ],
    upcomingMilestones: [
      "MS-06 IFC Drawing Release — forecast 20 Aug 2026 (delayed from 30 Jun 2026)",
      "MS-08 Equipment Delivery First Wave — 18 Sep 2026",
      "MS-09 Equipment Delivery Long Lead — 30 Oct 2026 (at risk)",
      "MS-10 Mechanical Completion — 13 Nov 2026",
    ],
    nextWeekFocus: [
      "Close the laboratory furniture shop drawing comments in the 05 Aug workshop",
      "Secure the leadership decision on the SEM-EDS purchase order",
      "Complete temporary lighting and temporary power readiness for the second shift",
      "Progress the cleanroom and gas system Rev.C submissions to the 12 Aug commitment",
    ],
    highlights: [
      "Exhaust duct hanger installation — zone C",
      "First CAPEX 2026 equipment delivery received on site",
      "Joint safety inspection with the INC2 EHS team",
    ],
  },
  {
    id: "wr-2026-30",
    weekNumber: 30,
    periodStart: "2026-07-20",
    periodEnd: "2026-07-26",
    publishedAt: "2026-07-27",
    preparedBy: "Warisa Kantifong",
    overallStatus: "YELLOW",
    overallProgress: 55,
    currentPhase: "Construction",
    keyAchievements: [
      "Polisher and grinder sample preparation set delivered to site store",
      "Utility matrix Rev.C submitted by SYME072",
      "Commissioning protocol for HVAC and exhaust issued for owner review",
    ],
    activitiesCompleted: [
      "Demolition fully complete across all zones",
      "Ceiling void survey for duct routing",
      "Chemical handling toolbox talk delivered to 19 personnel",
    ],
    safetySummary:
      "Safety score 94%. One hot work permit non-conformance identified and closed the same day. Zero LTI maintained.",
    procurementSummary:
      "Procurement 69% complete. Ion Chromatography and FT230 released for shipping. SEM-EDS commercial evaluation extended by a detector scope clarification.",
    capexSummary:
      "Seven POs issued of twelve CAPEX items. First delivery received. Cleanroom and gas packages still at RFQ stage pending design.",
    topRisks: [
      "R-01 SEM-EDS PO release (CRITICAL)",
      "R-04 Construction schedule slippage (HIGH)",
      "R-02 Exhaust riser landlord endorsement (HIGH)",
    ],
    openIssues: [
      "Temporary power distribution plan rejected",
      "Manpower histogram not submitted by the contractor",
    ],
    managementAttention: [
      "Schedule recovery plan required from Design Alternative",
      "SEM-EDS decision to be tabled at the 28 Jul leadership review",
    ],
    upcomingMilestones: [
      "MS-06 IFC Drawing Release — forecast 20 Aug 2026",
      "MS-08 Equipment Delivery First Wave — 18 Sep 2026",
    ],
    nextWeekFocus: [
      "Agree the two-shift recovery plan",
      "Progress the cleanroom and gas system Rev.C submissions",
    ],
    highlights: [
      "First CAPEX equipment delivery",
      "Commissioning protocol issued",
    ],
  },
];
