"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { queryClient } from "@/api/queryClient";
import {
  EmptyState,
  EntityTable,
  ErrorAlert,
  ErrorState,
  FilterActionStrip,
  FormModalShell,
  FormSection,
  LoadingState,
  PageHeader,
  PaginationControls,
  StatCard,
  StatusBadge,
} from "@/components";
import { groupsApi } from "@/domains/groups/api";
import type { GroupWritePayload } from "@/domains/types";

type GroupStatusFilter = "all" | "active" | "inactive";

interface GroupFormState {
  name: string;
  description: string;
  is_active: boolean;
}

const emptyGroupForm: GroupFormState = {
  name: "",
  description: "",
  is_active: true,
};

function toGroupPayload(formState: GroupFormState): GroupWritePayload {
  return {
    name: formState.name,
    description: formState.description || undefined,
    is_active: formState.is_active,
  };
}

export function GroupsPageScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<GroupStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formState, setFormState] = useState<GroupFormState>(emptyGroupForm);
  const deferredSearch = useDeferredValue(search);

  const groupsQuery = useQuery({
    queryKey: ["groups", { search: deferredSearch, statusFilter, page, pageSize }],
    queryFn: () =>
      groupsApi.listGroupsPage({
        search: deferredSearch || undefined,
        is_active: statusFilter === "all" ? undefined : statusFilter === "active",
        page,
        page_size: pageSize,
      }),
  });

  const createGroupMutation = useMutation({
    mutationFn: (payload: GroupWritePayload) => groupsApi.createGroup(payload),
    onSuccess: async (group) => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      setFormState(emptyGroupForm);
      setIsCreateModalOpen(false);
      router.push(`/groups/${group.id}`);
    },
  });

  const groups = groupsQuery.data?.items ?? [];
  const pagination = groupsQuery.data?.pagination ?? null;
  const totalGroups = pagination?.count ?? groups.length;
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";
  const activeGroups = groups.filter((group) => group.is_active).length;
  const inactiveGroups = groups.length - activeGroups;
  const activeGroupMembers = groups.reduce((count, group) => count + group.active_member_count, 0);
  const isCreateSubmitDisabled = createGroupMutation.isPending || !formState.name.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <button
            className="button button-primary"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            New ministry
          </button>
        }
        description="The current backend models ministries as flat groups. Use this screen to manage those group records and open each ministry detail workflow."
        eyebrow="Groups / ministries"
        meta={
          <StatusBadge
            label={`${totalGroups} ministry${totalGroups === 1 ? "" : "ies"}`}
            tone="info"
          />
        }
        title="Ministries"
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ministries" tone="accent" value={totalGroups} />
        <StatCard label="Active in view" value={activeGroups} />
        <StatCard label="Inactive in view" value={inactiveGroups} />
        <StatCard label="Memberships in view" value={activeGroupMembers} />
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
                setStatusFilter(event.target.value as GroupStatusFilter);
                setPage(1);
              }}
              value={statusFilter}
            >
              <option value="all">All ministries</option>
              <option value="active">Active ministries</option>
              <option value="inactive">Inactive ministries</option>
            </select>
          </label>
        }
        search={
          <label className="field">
            <span>Search ministries</span>
            <input
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by ministry name or description"
              value={search}
            />
          </label>
        }
      />

      <FormModalShell
        description="This writes directly to the current flat group model used as the ministry analogue."
        footer={
          <>
            <button
              className="button button-secondary"
              onClick={() => {
                setFormState(emptyGroupForm);
                setIsCreateModalOpen(false);
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={isCreateSubmitDisabled}
              form="create-ministry-modal-form"
              type="submit"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create ministry"}
            </button>
          </>
        }
        isOpen={isCreateModalOpen}
        onClose={() => {
          setFormState(emptyGroupForm);
          setIsCreateModalOpen(false);
        }}
        size="large"
        title="Create ministry"
      >
        <form
          className="space-y-6"
          id="create-ministry-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            createGroupMutation.mutate(toGroupPayload(formState));
          }}
        >
          <FormSection title="Ministry details">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Ministry name</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                  value={formState.name}
                />
              </label>

              <label className="checkbox-field checkbox-field-inline">
                <input
                  checked={formState.is_active}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Ministry is active</span>
              </label>
            </div>

            <label className="field">
              <span>Description</span>
              <textarea
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                value={formState.description}
              />
            </label>
          </FormSection>

          <ErrorAlert
            error={createGroupMutation.error}
            fallbackMessage="The ministry could not be created."
          />
        </form>
      </FormModalShell>

      {groupsQuery.isLoading ? (
        <LoadingState
          description="Fetching group records and active membership counts from the backend."
          title="Loading ministries"
        />
      ) : null}

      {groupsQuery.error ? (
        <ErrorState
          error={groupsQuery.error}
          onRetry={() => {
            void groupsQuery.refetch();
          }}
          title="Ministries could not be loaded"
        />
      ) : null}

      {!groupsQuery.isLoading && !groupsQuery.error && groups.length === 0 ? (
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
              <button className="button button-primary" onClick={() => setIsCreateModalOpen(true)} type="button">
                Create ministry
              </button>
            )
          }
          description={
            hasFilters
              ? "Try a broader search or reset the status filter."
              : "Create the first ministry to start assigning members into group-based operations."
          }
          title={
            hasFilters ? "No ministries matched the current filters" : "No ministries have been created yet"
          }
        />
      ) : null}

      {!groupsQuery.isLoading && !groupsQuery.error && groups.length > 0 ? (
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <EntityTable
            columns={[
              {
                header: "Ministry",
                cell: (group) => (
                  <div className="grid gap-1">
                    <Link className="font-semibold text-[#16335f] hover:underline" href={`/groups/${group.id}`}>
                      {group.name}
                    </Link>
                    <span className="block text-xs text-slate-500">{group.description || "No ministry description yet"}</span>
                  </div>
                ),
              },
              {
                header: "Active members",
                cell: (group) => group.active_member_count,
              },
              {
                header: "Status",
                cell: (group) => (
                  <StatusBadge
                    label={group.is_active ? "Active" : "Inactive"}
                    tone={group.is_active ? "success" : "muted"}
                  />
                ),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (group) => (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link className="button button-secondary button-compact" href={`/groups/${group.id}`}>
                      Manage
                    </Link>
                  </div>
                ),
              },
            ]}
            getRowKey={(group) => group.id}
            rows={groups}
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
