import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { DetailPanel } from "../components/DetailPanel";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { membersApi } from "../domains/members/api";
import { formatDate, formatDateTime } from "../utils/formatters";

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

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Notes</h3>
            <p className="muted-text">Notes are profile-level only at the current backend scope.</p>
          </div>
        </div>
        <p className="panel-copy">{member.notes || "No notes recorded for this member."}</p>
      </section>
    </div>
  );
}
