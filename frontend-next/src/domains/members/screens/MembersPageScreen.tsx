"use client";

import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  EmptyState,
  EntityTable,
  ErrorState,
  FilterActionStrip,
  LoadingState,
  PageHeader,
  PaginationControls,
  StatCard,
  StatusBadge,
} from "@/components";
import { membersApi } from "@/domains/members/api";

type MemberStatusFilter = "all" | "active" | "inactive";

export function MembersPageScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const deferredSearch = useDeferredValue(search);

  const membersQuery = useQuery({
    queryKey: ["members", { search: deferredSearch, statusFilter, page, pageSize }],
    queryFn: () =>
      membersApi.listMembersPage({
        search: deferredSearch || undefined,
        is_active: statusFilter === "all" ? undefined : statusFilter === "active",
        page,
        page_size: pageSize,
      }),
  });

  const members = membersQuery.data?.items ?? [];
  const pagination = membersQuery.data?.pagination ?? null;
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";
  const totalRecords = pagination?.count ?? members.length;
  const activeMembers = members.filter((member) => member.is_active).length;
  const inactiveMembers = members.length - activeMembers;
  const contactReadyMembers = members.filter(
    (member) => Boolean(member.email || member.phone_number),
  ).length;

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Link className="button button-primary" href="/members/new">
            Add member
          </Link>
        }
        description="A calm directory surface for member profiles, contact readiness, and profile-oriented create and edit workflows."
        eyebrow="People operations"
        meta={
          <StatusBadge
            label={`${totalRecords} record${totalRecords === 1 ? "" : "s"}`}
            tone="info"
          />
        }
        title="Members"
      />

      <section className="metrics-grid">
        <StatCard label="Directory records" value={totalRecords} tone="accent" />
        <StatCard label="Active in view" value={activeMembers} />
        <StatCard label="Inactive in view" value={inactiveMembers} />
        <StatCard label="Contact ready in view" value={contactReadyMembers} />
      </section>

      <FilterActionStrip
        actions={
          hasFilters ? (
            <button
              className="button button-secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setPage(1);
              }}
              type="button"
            >
              Clear filters
            </button>
          ) : null
        }
        filters={
          <label className="field">
            <span>Status</span>
            <select
              onChange={(event) => {
                setStatusFilter(event.target.value as MemberStatusFilter);
                setPage(1);
              }}
              value={statusFilter}
            >
              <option value="all">All members</option>
              <option value="active">Active members</option>
              <option value="inactive">Inactive members</option>
            </select>
          </label>
        }
        search={
          <label className="field">
            <span>Search members</span>
            <input
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, or phone"
              value={search}
            />
          </label>
        }
      />

      {membersQuery.isLoading ? (
        <LoadingState
          description="Pulling the member directory from the backend."
          title="Loading members"
        />
      ) : null}

      {membersQuery.error ? (
        <ErrorState
          error={membersQuery.error}
          onRetry={() => {
            void membersQuery.refetch();
          }}
          title="Members could not be loaded"
        />
      ) : null}

      {!membersQuery.isLoading && !membersQuery.error && members.length === 0 ? (
        <EmptyState
          action={
            hasFilters ? (
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setPage(1);
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : (
              <Link className="button button-primary" href="/members/new">
                Add member
              </Link>
            )
          }
          description={
            hasFilters
              ? "Try a broader search or reset the status filter."
              : "Create the first member record to start populating the directory."
          }
          title={hasFilters ? "No members matched the current filters" : "No members have been added yet"}
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
                    <Link className="table-link" href={`/members/${member.id}`}>
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
                    <Link className="button button-secondary button-compact" href={`/members/${member.id}`}>
                      View
                    </Link>
                    <Link className="button button-ghost button-compact" href={`/members/${member.id}/edit`}>
                      Edit
                    </Link>
                  </div>
                ),
              },
            ]}
            getRowKey={(member) => member.id}
            rows={members}
          />
          <PaginationControls
            onPageChange={(nextPage) => setPage(nextPage)}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            pagination={pagination}
          />
        </section>
      ) : null}
    </div>
  );
}
