import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { BlockedFeatureCard } from "../components/BlockedFeatureCard";
import { DetailPanel } from "../components/DetailPanel";
import { EmptyState } from "../components/EmptyState";
import { EntityTable } from "../components/EntityTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { membersApi } from "../domains/members/api";
import { formatDate, formatDateTime } from "../utils/formatters";

function getMemberInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MemberDetailPage() {
  const { memberId } = useParams();
  const numericMemberId = Number(memberId);

  const memberQuery = useQuery({
    enabled: Number.isFinite(numericMemberId),
    queryKey: ["member", numericMemberId],
    queryFn: () => membersApi.getMember(numericMemberId),
  });

  if (!Number.isFinite(numericMemberId)) {
    return (
      <ErrorState
        title="Member route is invalid"
        description="The requested member identifier is not valid."
        error={new Error("Invalid member identifier.")}
      />
    );
  }

  if (memberQuery.isLoading) {
    return <LoadingState title="Loading member profile" description="Fetching the current member record." />;
  }

  if (memberQuery.error || !memberQuery.data) {
    return (
      <ErrorState
        title="Member profile could not be loaded"
        error={memberQuery.error ?? new Error("Member not found.")}
        onRetry={() => {
          void memberQuery.refetch();
        }}
      />
    );
  }

  const member = memberQuery.data;
  const memberInitials = getMemberInitials(member.full_name);
  const activeGroupMemberships = member.group_memberships.filter((membership) => membership.is_active);
  const attendanceSummary = member.attendance_summary;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Member profile"
        title={member.full_name}
        description="Member profile, household context, ministry affiliations, and attendance summary in one operational detail surface."
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" to="/members">
              Back to members
            </Link>
            <Link className="button button-primary" to={`/members/${member.id}/edit`}>
              Edit member
            </Link>
          </div>
        }
        meta={
          <StatusBadge
            label={member.is_active ? "Active member" : "Inactive member"}
            tone={member.is_active ? "success" : "muted"}
          />
        }
      />

      <section className="entity-hero-card">
        <div className="entity-avatar" aria-hidden="true">
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
            <div className="detail-item">
              <dt>Email</dt>
              <dd>{member.email || "Not set"}</dd>
            </div>
            <div className="detail-item">
              <dt>Phone</dt>
              <dd>{member.phone_number || "Not set"}</dd>
            </div>
            <div className="detail-item">
              <dt>Date of birth</dt>
              <dd>{formatDate(member.date_of_birth)}</dd>
            </div>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        <StatCard
          label="Current household"
          value={member.active_household_membership?.household_name || "Not assigned"}
          tone="accent"
        />
        <StatCard
          label="Active ministries"
          value={activeGroupMemberships.length}
        />
        <StatCard
          label="Attendance records"
          value={attendanceSummary.total_records}
        />
        <StatCard
          label="Last attended"
          value={formatDate(attendanceSummary.last_attended_on)}
        />
      </section>

      <div className="content-grid">
        <DetailPanel
          title="Profile"
          items={[
            { label: "First name", value: member.first_name || "Not set" },
            { label: "Middle name", value: member.middle_name || "Not set" },
            { label: "Last name", value: member.last_name || "Not set" },
            { label: "Email", value: member.email || "Not set" },
            { label: "Phone", value: member.phone_number || "Not set" },
            { label: "Date of birth", value: formatDate(member.date_of_birth) },
          ]}
        />

        <DetailPanel
          title="Attendance summary"
          items={[
            {
              label: "Present",
              value: (
                attendanceSummary.present_count
              ),
            },
            { label: "Absent", value: attendanceSummary.absent_count },
            { label: "Late", value: attendanceSummary.late_count },
            { label: "Excused", value: attendanceSummary.excused_count },
            { label: "Total records", value: attendanceSummary.total_records },
            { label: "Last attended", value: formatDate(attendanceSummary.last_attended_on) },
          ]}
        />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Household context</h3>
            <p className="muted-text">Current and historical household memberships returned by the member detail endpoint.</p>
          </div>
        </div>

        {member.active_household_membership ? (
          <div className="detail-item">
            <dt>Current household</dt>
            <dd>
              <div className="inline-actions">
                <Link
                  className="table-link"
                  to={`/households/${member.active_household_membership.household_id}`}
                >
                  {member.active_household_membership.household_name}
                </Link>
                <StatusBadge
                  label={member.active_household_membership.is_head ? "Head" : member.active_household_membership.relationship_to_head}
                  tone={member.active_household_membership.is_head ? "info" : "muted"}
                />
              </div>
            </dd>
          </div>
        ) : (
          <EmptyState
            title="No active household membership"
            description="This member is not currently linked to an active household."
          />
        )}

        {member.household_memberships.length > 0 ? (
          <EntityTable
            columns={[
              {
                header: "Household",
                cell: (membership) => (
                  <Link className="table-link" to={`/households/${membership.household_id}`}>
                    {membership.household_name}
                  </Link>
                ),
              },
              {
                header: "Relationship",
                cell: (membership) => membership.is_head ? "Head" : membership.relationship_to_head,
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

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Ministry affiliations</h3>
            <p className="muted-text">Group memberships and roles from the current flat ministry/group model.</p>
          </div>
        </div>

        {member.group_memberships.length === 0 ? (
          <EmptyState
            title="No ministry affiliations"
            description="This member has no current or historical group memberships."
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Ministry",
                cell: (membership) => (
                  <Link className="table-link" to={`/groups/${membership.group_id}`}>
                    {membership.group_name}
                  </Link>
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

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Notes and metadata</h3>
            <p className="muted-text">Profile notes plus record timestamps.</p>
          </div>
        </div>
        <p className="panel-copy">{member.notes || "No notes recorded for this member."}</p>
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
        title="Finance and giving summary"
        description="The current backend member detail contract does not include member-linked finance or giving totals."
        reason="Finance records are ledger-based and currently not modeled as direct member-linked giving history."
        tone="info"
      />
    </div>
  );
}
