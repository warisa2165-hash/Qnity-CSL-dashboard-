import type { OwnerAttentionItem } from "@/lib/types";

export const attentionItems: OwnerAttentionItem[] = [
  {
    id: "oa-001",
    code: "OA-01",
    topic: "Release SEM-EDS purchase order (THB 12.8M)",
    description:
      "The SEM-EDS commercial evaluation is complete apart from a detector scope clarification. The vendor holds a manufacturing slot until 15 Aug 2026 against a 30-week lead time.",
    category: "Long lead equipment issue",
    escalationReason:
      "The purchase order exceeds the project manager's delegated authority and the manufacturing slot expires within two weeks.",
    requiredDecision:
      "Approve release of the SEM-EDS purchase order at the evaluated value of THB 12.8M.",
    recommendedAction:
      "Approve the PO release by 08 Aug 2026 and accept the clarified EDS detector scope as evaluated by the laboratory engineering team.",
    decisionOwner: "Peiming Zhou",
    requestedDecisionDate: "2026-08-08",
    impactIfDelayed:
      "Delivery moves beyond the commissioning window. SEM-EDS would not be available for the 06 Dec 2026 handover and would require a post-handover installation with a temporary external analytical service.",
    relatedRisk: "R-01",
    relatedMilestone: "MS-09",
    status: "OPEN",
    urgency: "RED",
    remarks: "Highest priority decision on the project this month.",
  },
  {
    id: "oa-002",
    code: "OA-02",
    topic: "Approve payment milestone PM-02 release strategy (THB 9.7M)",
    description:
      "Payment milestone PM-02 is tied to the full IFC drawing release. Eleven of fourteen design packages are approved; cleanroom and gas system packages remain in Rev.B.",
    category: "Payment milestone approval",
    escalationReason:
      "Design Alternative has requested a partial release against the approved disciplines. The contract does not provide for partial milestone payment.",
    requiredDecision:
      "Decide whether to hold PM-02 in full until complete IFC release, or approve a partial release of 70% against the approved packages.",
    recommendedAction:
      "Hold the milestone until the cleanroom and gas system Rev.C packages are approved (forecast 20 Aug 2026). Confirm in writing that no partial release will be made.",
    decisionOwner: "Samuel Chang",
    requestedDecisionDate: "2026-08-12",
    impactIfDelayed:
      "Contractor cash-flow pressure may reduce site manpower and worsen the existing construction schedule slippage.",
    relatedRisk: "R-03",
    relatedMilestone: "MS-06",
    status: "IN_REVIEW",
    urgency: "YELLOW",
    remarks: "Consultant recommendation supports holding the full milestone.",
  },
  {
    id: "oa-003",
    code: "OA-03",
    topic: "Endorse the two-shift construction recovery plan",
    description:
      "Construction stands at 41% against a 50% plan. Design Alternative proposes two-shift working for duct and MEP installation from 10 Aug 2026 to recover the schedule by 30 Sep 2026.",
    category: "Schedule recovery decision",
    escalationReason:
      "Two-shift working in a live building requires QNITY leadership endorsement and coordination with laboratory operations and the INC2 facility team.",
    requiredDecision:
      "Endorse two-shift working from 10 Aug 2026, including night-shift EHS supervision and restricted noisy activity hours.",
    recommendedAction:
      "Endorse subject to the temporary lighting and temporary power findings being closed and a night-shift EHS supervisor being named.",
    decisionOwner: "Peiming Zhou",
    requestedDecisionDate: "2026-08-07",
    impactIfDelayed:
      "Every week of delay in starting the second shift pushes mechanical completion beyond 13 Nov 2026 and compresses commissioning below four weeks.",
    relatedRisk: "R-04",
    relatedMilestone: "MS-10",
    status: "OPEN",
    urgency: "RED",
    remarks: "EHS pre-conditions tracked as ACT-107 and ACT-110.",
  },
  {
    id: "oa-004",
    code: "OA-04",
    topic: "Landlord endorsement for the exhaust duct riser penetration",
    description:
      "The exhaust riser penetration through the INC2 building core awaits landlord endorsement. Duct installation on the critical path cannot start without it.",
    category: "Contract approval",
    escalationReason:
      "Requires QNITY leadership engagement with the Thailand Science Park / INC2 building management at director level.",
    requiredDecision:
      "Authorise a formal QNITY approach to INC2 building management to expedite the endorsement, and confirm acceptance of any landlord reinstatement conditions.",
    recommendedAction:
      "Engineering Head to lead a joint technical session with the INC2 facility team in the week of 11 Aug 2026 with QNITY leadership sponsorship.",
    decisionOwner: "Song Dong",
    requestedDecisionDate: "2026-08-15",
    impactIfDelayed:
      "Exhaust duct installation stalls, blocking fume hood manufacturing release and mechanical completion.",
    relatedRisk: "R-02",
    relatedMilestone: "MS-10",
    status: "IN_REVIEW",
    urgency: "RED",
    remarks: "No formal landlord objection has been raised to date.",
  },
  {
    id: "oa-005",
    code: "OA-05",
    topic: "Award the supporting utility equipment package (THB 2.75M)",
    description:
      "Technical evaluation of three quotations for DI water, chiller and compressed air equipment is nearing completion. Award is targeted for 15 Aug 2026.",
    category: "Procurement decision",
    escalationReason:
      "Award value exceeds the procurement lead's delegated authority and includes the contingency chiller that addresses the INC2 chilled water capacity risk.",
    requiredDecision:
      "Approve award to the recommended vendor including the contingency dedicated chiller scope.",
    recommendedAction:
      "Approve at the 15 Aug 2026 procurement review once the chilled water capacity verification (ACT-112) is complete.",
    decisionOwner: "Rita Tang",
    requestedDecisionDate: "2026-08-15",
    impactIfDelayed:
      "A 16-week lead time places delivery beyond 09 Oct 2026 and into the commissioning window.",
    relatedRisk: "R-10",
    relatedMilestone: "MS-11",
    status: "OPEN",
    urgency: "YELLOW",
    remarks: "Chilled water verification session already booked.",
  },
  {
    id: "oa-006",
    code: "OA-06",
    topic: "Design Alternative site supervision shortfall",
    description:
      "Contractor site supervision headcount has been below the contract commitment for three consecutive weeks during peak MEP installation.",
    category: "Contractor performance issue",
    escalationReason:
      "Two formal notices have been issued without a sustained recovery. Contractual remedy requires leadership direction.",
    requiredDecision:
      "Decide whether to proceed to a contractual remedy if the manpower histogram is not met by 12 Aug 2026.",
    recommendedAction:
      "Issue a final written notice now, with a leadership-level meeting with the Design Alternative managing director in the week of 10 Aug 2026.",
    decisionOwner: "Samuel Chang",
    requestedDecisionDate: "2026-08-12",
    impactIfDelayed:
      "Supervision shortfall during two-shift working raises both quality and safety exposure.",
    relatedRisk: "R-08",
    relatedMilestone: null,
    status: "OPEN",
    urgency: "YELLOW",
    remarks: "Tracked as ACT-108.",
  },
  {
    id: "oa-007",
    code: "OA-07",
    topic: "Approve the additional sample preparation bench change request",
    description:
      "Laboratory users have requested an additional bench in the sample preparation room. Design Alternative is returning cost and schedule impact by 05 Aug 2026.",
    category: "Change request",
    escalationReason:
      "Any change above THB 250,000 requires leadership approval before instruction under the change control procedure.",
    requiredDecision:
      "Approve or reject the change once the contractor's cost and schedule impact is received.",
    recommendedAction:
      "Approve only if the schedule impact is nil and the cost is within the remaining contingency (currently 3.2% of contract value available).",
    decisionOwner: "Samuel Chang",
    requestedDecisionDate: "2026-08-19",
    impactIfDelayed:
      "Instructing the change after the furniture production release would incur a change-of-order penalty from the vendor.",
    relatedRisk: "R-09",
    relatedMilestone: null,
    status: "OPEN",
    urgency: "YELLOW",
    remarks: "Cost impact not yet received (ACT-113).",
  },
  {
    id: "oa-008",
    code: "OA-08",
    topic: "Temporary power compliance before second-shift start",
    description:
      "The temporary power distribution plan was rejected on EHS grounds on 29 Jun 2026 and a compliant plan has not been resubmitted.",
    category: "Safety decision",
    escalationReason:
      "Overdue by more than one month and now a pre-condition for the two-shift recovery plan.",
    requiredDecision:
      "Confirm that the second shift will not start until a compliant temporary power plan is approved.",
    recommendedAction:
      "Confirm the EHS stop condition in writing to Design Alternative and link it to the two-shift endorsement in OA-03.",
    decisionOwner: "Warisa Kantifong",
    requestedDecisionDate: "2026-07-31",
    impactIfDelayed:
      "Starting a night shift on a non-compliant temporary supply would breach the approved HSE plan and QNITY EHS standards.",
    relatedRisk: "R-13",
    relatedMilestone: null,
    status: "OVERDUE",
    urgency: "RED",
    remarks: "Decision date has passed — requires closure at the next leadership review.",
  },
];
