import type { SafetyMonthlyStat, SafetyReport } from "@/lib/types";

export const safetyReports: SafetyReport[] = [
  {
    id: "saf-001",
    code: "SR-2026-018",
    date: "2026-07-30",
    reportedBy: "Kanthima Sawatdee",
    description:
      "Housekeeping observation — offcut material accumulating in the corridor egress route outside the CSL entrance.",
    category: "OBSERVATION",
    severity: "MEDIUM",
    correctiveAction:
      "Daily housekeeping sweep added to the end-of-shift checklist; dedicated waste skip positioned at the loading area.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-08-04",
    status: "IN_PROGRESS",
    evidenceUrl: null,
  },
  {
    id: "saf-002",
    code: "SR-2026-017",
    date: "2026-07-28",
    reportedBy: "Rattiya Janpum",
    description:
      "Near miss — unsecured ladder shifted while a worker was accessing the ceiling void for duct hanger installation. No injury.",
    category: "NEAR_MISS",
    severity: "HIGH",
    correctiveAction:
      "Ladder inspection and tagging regime reinforced; mobile scaffold mandated for all work above 2 m. Toolbox talk delivered to all trades.",
    owner: "Kanthima Sawatdee",
    dueDate: "2026-08-01",
    status: "CLOSED",
    evidenceUrl: null,
  },
  {
    id: "saf-003",
    code: "SR-2026-016",
    date: "2026-07-24",
    reportedBy: "Kanthima Sawatdee",
    description:
      "Hot work permit audit — welding screen not deployed during duct bracket welding in zone C.",
    category: "PERMIT_TO_WORK",
    severity: "HIGH",
    correctiveAction:
      "Permit suspended and reissued after screens deployed; fire watch briefing repeated for all welders.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-07-26",
    status: "CLOSED",
    evidenceUrl: null,
  },
  {
    id: "saf-004",
    code: "SR-2026-015",
    date: "2026-07-21",
    reportedBy: "Sarawut Thongchai",
    description:
      "First aid case — minor hand laceration while handling a sheet metal duct section.",
    category: "FIRST_AID",
    severity: "LOW",
    correctiveAction:
      "Cut-resistant gloves issued as mandatory PPE for all sheet metal handling; task risk assessment revised.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-07-25",
    status: "CLOSED",
    evidenceUrl: null,
  },
  {
    id: "saf-005",
    code: "SR-2026-014",
    date: "2026-07-17",
    reportedBy: "Kanthima Sawatdee",
    description:
      "Weekly joint safety inspection with the INC2 building EHS team. Two minor findings raised on temporary cable management.",
    category: "INSPECTION",
    severity: "MEDIUM",
    correctiveAction:
      "Temporary cables re-routed at high level with dedicated hangers; interim RCD board relocated out of the walkway.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-07-24",
    status: "CLOSED",
    evidenceUrl: null,
  },
  {
    id: "saf-006",
    code: "SR-2026-013",
    date: "2026-07-14",
    reportedBy: "Nattapong Wongsiri",
    description:
      "Toolbox talk — working at height and ladder safety, delivered to 24 site personnel.",
    category: "TOOLBOX_TALK",
    severity: "LOW",
    correctiveAction: "Attendance register filed. Topic repeated for the incoming second shift.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-07-14",
    status: "CLOSED",
    evidenceUrl: null,
  },
  {
    id: "saf-007",
    code: "SR-2026-012",
    date: "2026-07-08",
    reportedBy: "Kanthima Sawatdee",
    description:
      "Observation — temporary power distribution board not compliant with the approved HSE plan (no RCD on two outlets).",
    category: "OBSERVATION",
    severity: "HIGH",
    correctiveAction:
      "Board taken out of service and replaced. Compliant temporary power plan to be resubmitted by Design Alternative.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-07-20",
    status: "OVERDUE",
    evidenceUrl: null,
  },
  {
    id: "saf-008",
    code: "SR-2026-011",
    date: "2026-07-03",
    reportedBy: "Rattiya Janpum",
    description:
      "Observation — dust partition seal gap allowing construction dust into the adjacent operating laboratory.",
    category: "OBSERVATION",
    severity: "MEDIUM",
    correctiveAction:
      "Partition sealed and a negative-pressure dust extractor installed inside the work area.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-07-10",
    status: "CLOSED",
    evidenceUrl: null,
  },
  {
    id: "saf-009",
    code: "SR-2026-010",
    date: "2026-06-26",
    reportedBy: "Kanthima Sawatdee",
    description:
      "Near miss — material hoisting load swung close to a walkway that had not been barricaded.",
    category: "NEAR_MISS",
    severity: "HIGH",
    correctiveAction:
      "Exclusion zone procedure enforced for all lifting; banksman assigned to every lift.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-07-03",
    status: "CLOSED",
    evidenceUrl: null,
  },
  {
    id: "saf-010",
    code: "SR-2026-009",
    date: "2026-06-19",
    reportedBy: "Kanthima Sawatdee",
    description:
      "Monthly emergency response drill for the CSL renovation area, including evacuation route verification.",
    category: "INSPECTION",
    severity: "LOW",
    correctiveAction: "Evacuation completed in 3 min 40 s. Assembly point signage improved.",
    owner: "Kanthima Sawatdee",
    dueDate: "2026-06-26",
    status: "CLOSED",
    evidenceUrl: null,
  },
  {
    id: "saf-011",
    code: "SR-2026-008",
    date: "2026-07-31",
    reportedBy: "Kanthima Sawatdee",
    description:
      "Pre-second-shift readiness inspection — night lighting levels in the work area below 200 lux in two zones.",
    category: "INSPECTION",
    severity: "MEDIUM",
    correctiveAction:
      "Additional temporary lighting to be installed before the second shift commences on 10 Aug 2026.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-08-08",
    status: "OPEN",
    evidenceUrl: null,
  },
  {
    id: "saf-012",
    code: "SR-2026-007",
    date: "2026-07-29",
    reportedBy: "Nattapong Wongsiri",
    description:
      "Toolbox talk — chemical handling and spill response ahead of laboratory gas line works.",
    category: "TOOLBOX_TALK",
    severity: "LOW",
    correctiveAction: "Attendance register filed for 19 personnel.",
    owner: "Nattapong Wongsiri",
    dueDate: "2026-07-29",
    status: "CLOSED",
    evidenceUrl: null,
  },
];

export const safetyMonthly: SafetyMonthlyStat[] = [
  { month: "Feb", lti: 0, nearMiss: 0, firstAid: 0, observations: 1, toolboxTalks: 2, manhours: 320, safetyScore: 100 },
  { month: "Mar", lti: 0, nearMiss: 0, firstAid: 0, observations: 2, toolboxTalks: 3, manhours: 640, safetyScore: 99 },
  { month: "Apr", lti: 0, nearMiss: 0, firstAid: 1, observations: 3, toolboxTalks: 4, manhours: 980, safetyScore: 97 },
  { month: "May", lti: 0, nearMiss: 1, firstAid: 0, observations: 4, toolboxTalks: 5, manhours: 1_450, safetyScore: 96 },
  { month: "Jun", lti: 0, nearMiss: 1, firstAid: 1, observations: 6, toolboxTalks: 6, manhours: 2_380, safetyScore: 95 },
  { month: "Jul", lti: 0, nearMiss: 1, firstAid: 1, observations: 7, toolboxTalks: 8, manhours: 3_120, safetyScore: 94 },
];

export const safetySummary = {
  ltiFreeDays: 198,
  totalManhours: 8_890,
  openFindings: 3,
  closedFindings: 21,
  overdueFindings: 1,
  safetyScore: 94,
  permitsIssuedThisMonth: 14,
  toolboxTalksThisMonth: 8,
};
