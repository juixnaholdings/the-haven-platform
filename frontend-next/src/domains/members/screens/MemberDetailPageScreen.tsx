"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  BlockedFeatureCard,
  DetailPanel,
  EmptyState,
  EntityTable,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components";
import { membersApi } from "@/domains/members/api";
import { MemberFormScreen } from "@/domains/members/screens/MemberFormScreen";
import { formatDate, formatDateTime } from "@/lib/formatters";

function getMemberInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MemberDetailPageScreen() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const params = useParams<{ memberId: string }>();
  const numericMemberId = Number(params.memberId);

  const memberQuery = useQuery({
    enabled: Number.isFinite(numericMemberId),
    queryKey: ["member", numericMemberId],
    queryFn: () => membersApi.getMember(numericMemberId),
  });

  if (!Number.isFinite(numericMemberId)) {
    return (
      <ErrorState
        description="The requested member identifier is not valid."
        error={new Error("Invalid member identifier.")}
        title="Member route is invalid"
      />
    );
  }

  if (memberQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching the current member record."
        title="Loading member profile"
      />
    );
  }

  if (memberQuery.error || !memberQuery.data) {
    return (
      <ErrorState
        error={memberQuery.error ?? new Error("Member not found.")}
        onRetry={() => {
          void memberQuery.refetch();
        }}
        title="Member profile could not be loaded"
      />
    );
  }

  const member = memberQuery.data;
  const memberInitials = getMemberInitials(member.full_name);
  const activeGroupMemberships = member.group_memberships.filter((membership) => membership.is_active);
  const attendanceSummary = member.attendance_summary;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link className="button button-secondary" href="/members">
              Back to members
            </Link>
            <button
              className="button button-primary"
              onClick={() => setIsEditModalOpen(true)}
              type="button"
            >
              Edit member
            </button>
          </div>
        }
        description="Member profile, household context, ministry affiliations, and attendance summary in one operational detail surface."
        eyebrow="Member profile"
        meta={
          <StatusBadge
            label={member.is_active ? "Active member" : "Inactive member"}
            tone={member.is_active ? "success" : "muted"}
          />
        }
        title={member.full_name}
      />

      <section className="entity-hero-card">
        <div aria-hidden="true" className="entity-avatar">
          {memberInitials}
        </div>
        <div className="entity-hero-copy">
          <div className="entity-hero-header">
            <div>
              <p className="app-eyebrow">Profile summary</p>
              <h3>{member.full_name}</h3>
            </div>
            <StatusBadge
              label={member.is_active ? "Active member" : "Inactive member"}
              tone={member.is_active ? "success" : "muted"}
            />
          </div>
          <div className="entity-hero-metadata">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Email</dt>
              <dd>{member.email || "Not set"}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Phone</dt>
              <dd>{member.phone_number || "Not set"}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Date of birth</dt>
              <dd>{formatDate(member.date_of_birth)}</dd>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current household"
          value={member.active_household_membership?.household_name || "Not assigned"}
          tone="accent"
        />
        <StatCard label="Active ministries" value={activeGroupMemberships.length} />
        <StatCard label="Attendance records" value={attendanceSummary.total_records} />
        <StatCard label="Last attended" value={formatDate(attendanceSummary.last_attended_on)} />
      </section>

      <div className="grid gap-4 items-start grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <DetailPanel
          items={[
            { label: "First name", value: member.first_name || "Not set" },
            { label: "Middle name", value: member.middle_name || "Not set" },
            { label: "Last name", value: member.last_name || "Not set" },
            { label: "Email", value: member.email || "Not set" },
            { label: "Phone", value: member.phone_number || "Not set" },
            { label: "Date of birth", value: formatDate(member.date_of_birth) },
          ]}
          title="Profile"
        />

        <DetailPanel
          items={[
            { label: "Present", value: attendanceSummary.present_count },
            { label: "Absent", value: attendanceSummary.absent_count },
            { label: "Late", value: attendanceSummary.late_count },
            { label: "Excused", value: attendanceSummary.excused_count },
            { label: "Total records", value: attendanceSummary.total_records },
            { label: "Last attended", value: formatDate(attendanceSummary.last_attended_on) },
          ]}
          title="Attendance summary"
        />
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Household context</h3>
            <p className="m-0 text-sm text-slate-500">
              Current and historical household memberships returned by the member detail endpoint.
            </p>
          </div>
        </div>

        {member.active_household_membership ? (
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
            <dt>Current household</dt>
            <dd>
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  className="font-semibold text-[#16335f] hover:underline"
                  href={`/households/${member.active_household_membership.household_id}`}
                >
                  {member.active_household_membership.household_name}
                </Link>
                <StatusBadge
                  label={
                    member.active_household_membership.is_head
                      ? "Head"
                      : member.active_household_membership.relationship_to_head
                  }
                  tone={member.active_household_membership.is_head ? "info" : "muted"}
                />
              </div>
            </dd>
          </div>
        ) : (
          <EmptyState
            description="This member is not currently linked to an active household."
            title="No active household membership"
          />
        )}

        {member.household_memberships.length > 0 ? (
          <EntityTable
            columns={[
              {
                header: "Household",
                cell: (membership) => (
                  <Link className="font-semibold text-[#16335f] hover:underline" href={`/households/${membership.household_id}`}>
                    {membership.household_name}
                  </Link>
                ),
              },
              {
                header: "Relationship",
                cell: (membership) => (membership.is_head ? "Head" : membership.relationship_to_head),
              },
              {
                header: "Joined",
                cell: (membership) => formatDate(membership.joined_on),
              },
              {
                header: "Left",
                cell: (membership) => formatDate(membership.left_on),
              },
              {
                header: "Status",
                cell: (membership) => (
                  <StatusBadge
                    label={membership.is_active ? "Active" : "Inactive"}
                    tone={membership.is_active ? "success" : "muted"}
                  />
                ),
              },
            ]}
            getRowKey={(membership) => membership.id}
            rows={member.household_memberships}
          />
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Ministry affiliations</h3>
            <p className="m-0 text-sm text-slate-500">
              Group memberships and roles from the current flat ministry/group model.
            </p>
          </div>
        </div>

        {member.group_memberships.length === 0 ? (
          <EmptyState
            description="This member has no current or historical group memberships."
            title="No ministry affiliations"
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Ministry",
                cell: (membership) => (
                  <span className="font-semibold text-[#16335f] hover:underline">{membership.group_name}</span>
                ),
              },
              {
                header: "Role",
                cell: (membership) => membership.role_name || "General member",
              },
              {
                header: "Started",
                cell: (membership) => formatDate(membership.started_on),
              },
              {
                header: "Ended",
                cell: (membership) => formatDate(membership.ended_on),
              },
              {
                header: "Status",
                cell: (membership) => (
                  <StatusBadge
                    label={membership.is_active ? "Active" : "Inactive"}
                    tone={membership.is_active ? "success" : "muted"}
                  />
                ),
              },
            ]}
            getRowKey={(membership) => membership.id}
            rows={member.group_memberships}
          />
        )}
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Notes and metadata</h3>
            <p className="m-0 text-sm text-slate-500">Profile notes plus record timestamps.</p>
          </div>
        </div>
        <p className="m-0 whitespace-pre-wrap text-sm text-slate-600">{member.notes || "No notes recorded for this member."}</p>
        <dl className="definition-list">
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(member.created_at)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDateTime(member.updated_at)}</dd>
          </div>
        </dl>
      </section>

      <BlockedFeatureCard
        description="The current backend member detail contract does not include member-linked finance or giving totals."
        reason="Finance records are ledger-based and currently not modeled as direct member-linked giving history."
        title="Finance and giving summary"
        tone="info"
      />

      {isEditModalOpen ? (
        <MemberFormScreen
          key={member.id}
          memberId={member.id}
          mode="modal"
          onCancel={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
