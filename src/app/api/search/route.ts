import { NextResponse } from "next/server";

import { currentUser, toAccessProfile } from "@/lib/auth";
import { canViewPage, type PageKey } from "@/lib/rbac";
import * as data from "@/lib/data";

interface Hit {
  label: string;
  href: string;
  context: string;
}

/**
 * Permission-aware record search. Each source is only consulted if the caller
 * is allowed to view the page that owns it, so search can never leak a record
 * from a restricted section.
 */
export async function GET(request: Request) {
  const user = await currentUser();
  const profile = toAccessProfile(user);
  if (!profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const allowed = (page: PageKey) => canViewPage(profile, page);
  const results: Hit[] = [];
  const match = (...fields: (string | null | undefined)[]) =>
    fields.some((f) => f?.toLowerCase().includes(query));

  if (allowed("milestones")) {
    for (const m of await data.getMilestones()) {
      if (match(m.code, m.name, m.description, m.owner)) {
        results.push({
          label: `${m.code} — ${m.name}`,
          href: "/milestones",
          context: `Milestone · ${m.phase}`,
        });
      }
    }
  }

  if (allowed("risks")) {
    for (const r of await data.getRisks()) {
      if (match(r.code, r.description, r.category, r.owner)) {
        results.push({
          label: `${r.code} — ${r.description.slice(0, 70)}`,
          href: "/risks",
          context: `Risk · ${r.level} · ${r.category}`,
        });
      }
    }
  }

  if (allowed("actions")) {
    for (const a of await data.getActions()) {
      if (match(a.code, a.description, a.owner, a.sourceMeeting)) {
        results.push({
          label: `${a.code} — ${a.description.slice(0, 70)}`,
          href: "/actions",
          context: `Action · ${a.owner} · ${a.status}`,
        });
      }
    }
  }

  if (allowed("submissions")) {
    for (const s of await data.getSubmissions()) {
      if (match(s.code, s.title, s.documentType, s.reviewer)) {
        results.push({
          label: `${s.code} — ${s.title}`,
          href: "/submissions",
          context: `Submission · ${s.submittedBy} · ${s.status}`,
        });
      }
    }
  }

  if (allowed("capex")) {
    for (const e of await data.getCapex()) {
      if (match(e.code, e.name, e.category, e.vendor, e.capexNumber)) {
        results.push({
          label: `${e.code} — ${e.name}`,
          href: "/capex",
          context: `CAPEX equipment · ${e.category}`,
        });
      }
    }
  }

  if (allowed("procurement")) {
    for (const p of await data.getProcurement()) {
      if (match(p.code, p.packageName, p.vendor, p.poNumber)) {
        results.push({
          label: `${p.code} — ${p.packageName}`,
          href: "/procurement",
          context: `Procurement · ${p.stage}`,
        });
      }
    }
  }

  if (allowed("documents")) {
    const documents = await data.getDocuments();
    for (const d of documents) {
      if (d.restrictedTo && !d.restrictedTo.includes(profile.role)) continue;
      if (match(d.name, d.folder, d.category)) {
        results.push({
          label: d.name,
          href: "/documents",
          context: `Document · ${d.folder} · ${d.revision}`,
        });
      }
    }
  }

  if (allowed("owner-attention")) {
    for (const a of await data.getAttentionItems()) {
      if (match(a.code, a.topic, a.category, a.decisionOwner)) {
        results.push({
          label: `${a.code} — ${a.topic}`,
          href: "/owner-attention",
          context: `Owner attention · ${a.category}`,
        });
      }
    }
  }

  if (allowed("safety")) {
    for (const s of await data.getSafetyReports()) {
      if (match(s.code, s.description, s.owner)) {
        results.push({
          label: `${s.code} — ${s.description.slice(0, 70)}`,
          href: "/safety",
          context: `Safety report · ${s.category}`,
        });
      }
    }
  }

  return NextResponse.json({ results: results.slice(0, 25) });
}
