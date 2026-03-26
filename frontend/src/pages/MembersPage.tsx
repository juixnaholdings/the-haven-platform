import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { EntityTable } from "../components/EntityTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { membersApi } from "../domains/members/api";

type MemberStatusFilter = "all" | "active" | "inactive";

export function MembersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("all");
  const deferredSearch = useDeferredValue(search);

  const membersQuery = useQuery({
    queryKey: ["members", { search: deferredSearch, statusFilter }],
    queryFn: () =>
      membersApi.listMembers({
        search: deferredSearch || undefined,
        is_active:
          statusFilter === "all" ? undefined : statusFilter === "active",
      }),
  });

  const members = membersQuery.data ?? [];
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="People operations"
        title="Members"
        description="Manage the member directory, review profile details, and move into the profile-oriented create and edit flows."
        actions={
          <Link className="button button-primary" to="/members/new">
            Add member
          </Link>
        }
        meta={
          <StatusBadge
            label={`${members.length} record${members.length === 1 ? "" : "s"}`}
            tone="info"
          />
        }
      />

      <section className="panel">
        <div className="filters-grid filters-grid-2">
          <label className="field">
            <span>Search members</span>
            <input
              placeholder="Search by name, email, or phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as MemberStatusFilter)}
            >
              <option value="all">All members</option>
              <option value="active">Active members</option>
              <option value="inactive">Inactive members</option>
            </select>
          </label>
        </div>
      </section>

      {membersQuery.isLoading ? (
        <LoadingState title="Loading members" description="Pulling the member directory from the backend." />
      ) : null}

      {membersQuery.error ? (
        <ErrorState
          title="Members could not be loaded"
          error={membersQuery.error}
          onRetry={() => {
            void membersQuery.refetch();
          }}
        />
      ) : null}

      {!membersQuery.isLoading && !membersQuery.error && members.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No members matched the current filters" : "No members have been added yet"}
          description={
            hasFilters
              ? "Try a broader search or reset the status filter."
              : "Create the first member record to start populating the directory."
          }
          action={
            hasFilters ? (
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : (
              <Link className="button button-primary" to="/members/new">
                Add member
              </Link>
            )
          }
        />
      ) : null}

      {!membersQuery.isLoading && !membersQuery.error && members.length > 0 ? (
        <section className="panel">
          <EntityTable
            columns={[
              {
                header: "Member",
                cell: (member) => (
                  <div className="cell-stack">
                    <Link className="table-link" to={`/members/${member.id}`}>
                      {member.full_name}
                    </Link>
                    <span className="table-subtext">
                      {member.email || member.phone_number || "Profile-only record"}
                    </span>
                  </div>
                ),
              },
              {
                header: "Email",
                cell: (member) => member.email || "—",
              },
              {
                header: "Phone",
                cell: (member) => member.phone_number || "—",
              },
              {
                header: "Status",
                cell: (member) => (
                  <StatusBadge
                    label={member.is_active ? "Active" : "Inactive"}
                    tone={member.is_active ? "success" : "muted"}
                  />
                ),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (member) => (
                  <div className="inline-actions">
                    <Link className="button button-secondary button-compact" to={`/members/${member.id}`}>
                      View
                    </Link>
                    <Link className="button button-ghost button-compact" to={`/members/${member.id}/edit`}>
                      Edit
                    </Link>
                  </div>
                ),
              },
            ]}
            getRowKey={(member) => member.id}
            rows={members}
          />
        </section>
      ) : null}
    </div>
  );
}
