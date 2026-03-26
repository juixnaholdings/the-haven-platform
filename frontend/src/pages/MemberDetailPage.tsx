import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { DetailPanel } from "../components/DetailPanel";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
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

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Member profile"
        title={member.full_name}
        description="This detail screen is intentionally profile-oriented. Cross-domain activity, household history, and affiliation history are not yet aggregated by the backend."
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
          title="Record metadata"
          items={[
            {
              label: "Status",
              value: (
                <StatusBadge
                  label={member.is_active ? "Active" : "Inactive"}
                  tone={member.is_active ? "success" : "muted"}
                />
              ),
            },
            { label: "Created", value: formatDateTime(member.created_at) },
            { label: "Last updated", value: formatDateTime(member.updated_at) },
          ]}
        />
      </div>

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Notes</h3>
              <p className="muted-text">Notes are profile-level only at the current backend scope.</p>
            </div>
          </div>
          <p className="panel-copy">{member.notes || "No notes recorded for this member."}</p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Current backend scope</h3>
              <p className="muted-text">This page stays honest to the profile payload the backend currently exposes.</p>
            </div>
          </div>
          <ul className="item-list">
            <li className="item-row">
              <div>
                <strong>Included now</strong>
                <span>Core identity, contact details, notes, and audit timestamps.</span>
              </div>
            </li>
            <li className="item-row">
              <div>
                <strong>Not aggregated yet</strong>
                <span>Household history, group history, attendance history, and finance history.</span>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
