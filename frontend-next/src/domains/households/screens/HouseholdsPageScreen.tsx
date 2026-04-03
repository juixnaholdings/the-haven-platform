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
  FormSection,
  LoadingState,
  PageHeader,
  PaginationControls,
  StatCard,
  StatusBadge,
} from "@/components";
import { householdsApi } from "@/domains/households/api";
import type { HouseholdWritePayload } from "@/domains/types";

type HouseholdStatusFilter = "all" | "active" | "inactive";

interface HouseholdFormState {
  name: string;
  primary_phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  notes: string;
  is_active: boolean;
}

const emptyHouseholdForm: HouseholdFormState = {
  name: "",
  primary_phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  notes: "",
  is_active: true,
};

function toHouseholdPayload(formState: HouseholdFormState): HouseholdWritePayload {
  return {
    name: formState.name,
    primary_phone: formState.primary_phone || undefined,
    address_line_1: formState.address_line_1 || undefined,
    address_line_2: formState.address_line_2 || undefined,
    city: formState.city || undefined,
    notes: formState.notes || undefined,
    is_active: formState.is_active,
  };
}

export function HouseholdsPageScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HouseholdStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState<HouseholdFormState>(emptyHouseholdForm);
  const deferredSearch = useDeferredValue(search);

  const householdsQuery = useQuery({
    queryKey: ["households", { search: deferredSearch, statusFilter, page, pageSize }],
    queryFn: () =>
      householdsApi.listHouseholdsPage({
        search: deferredSearch || undefined,
        is_active: statusFilter === "all" ? undefined : statusFilter === "active",
        page,
        page_size: pageSize,
      }),
  });

  const createHouseholdMutation = useMutation({
    mutationFn: (payload: HouseholdWritePayload) => householdsApi.createHousehold(payload),
    onSuccess: async (household) => {
      await queryClient.invalidateQueries({ queryKey: ["households"] });
      setFormState(emptyHouseholdForm);
      setShowCreateForm(false);
      router.push(`/households/${household.id}`);
    },
  });

  const households = householdsQuery.data?.items ?? [];
  const pagination = householdsQuery.data?.pagination ?? null;
  const totalHouseholds = pagination?.count ?? households.length;
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";
  const activeHouseholds = households.filter((household) => household.is_active).length;
  const inactiveHouseholds = households.length - activeHouseholds;
  const linkedMembers = households.reduce(
    (count, household) => count + household.active_member_count,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className={showCreateForm ? "button button-secondary" : "button button-primary"}
              onClick={() => setShowCreateForm((current) => !current)}
              type="button"
            >
              {showCreateForm ? "Close form" : "New household"}
            </button>
          </div>
        }
        description="Manage household records, keep family contact data current, and open the detail view for member assignment and household updates."
        eyebrow="People operations"
        meta={
          <StatusBadge
            label={`${totalHouseholds} household${totalHouseholds === 1 ? "" : "s"}`}
            tone="info"
          />
        }
        title="Households"
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Households" value={totalHouseholds} tone="accent" />
        <StatCard label="Active in view" value={activeHouseholds} />
        <StatCard label="Inactive in view" value={inactiveHouseholds} />
        <StatCard label="Linked members in view" value={linkedMembers} />
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
                setStatusFilter(event.target.value as HouseholdStatusFilter);
                setPage(1);
              }}
              value={statusFilter}
            >
              <option value="all">All households</option>
              <option value="active">Active households</option>
              <option value="inactive">Inactive households</option>
            </select>
          </label>
        }
        search={
          <label className="field">
            <span>Search households</span>
            <input
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by household name, phone, or city"
              value={search}
            />
          </label>
        }
      />

      {showCreateForm ? (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            createHouseholdMutation.mutate(toHouseholdPayload(formState));
          }}
        >
          <FormSection
            description="This form maps directly to the current household create payload and opens the real detail workflow after save."
            title="Create household"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Household name</span>
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

              <label className="field">
                <span>Primary phone</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      primary_phone: event.target.value,
                    }))
                  }
                  value={formState.primary_phone}
                />
              </label>

              <label className="field">
                <span>City</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  value={formState.city}
                />
              </label>

              <label className="field">
                <span>Address line 1</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      address_line_1: event.target.value,
                    }))
                  }
                  value={formState.address_line_1}
                />
              </label>

              <label className="field">
                <span>Address line 2</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      address_line_2: event.target.value,
                    }))
                  }
                  value={formState.address_line_2}
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
                <span>Household is active</span>
              </label>
            </div>

            <label className="field">
              <span>Notes</span>
              <textarea
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={4}
                value={formState.notes}
              />
            </label>
          </FormSection>

          <ErrorAlert
            error={createHouseholdMutation.error}
            fallbackMessage="The household could not be created."
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              disabled={createHouseholdMutation.isPending}
              type="submit"
            >
              {createHouseholdMutation.isPending ? "Creating..." : "Create household"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setShowCreateForm(false);
                setFormState(emptyHouseholdForm);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {householdsQuery.isLoading ? (
        <LoadingState
          description="Pulling household records and member counts from the backend."
          title="Loading households"
        />
      ) : null}

      {householdsQuery.error ? (
        <ErrorState
          error={householdsQuery.error}
          onRetry={() => {
            void householdsQuery.refetch();
          }}
          title="Households could not be loaded"
        />
      ) : null}

      {!householdsQuery.isLoading && !householdsQuery.error && households.length === 0 ? (
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
              <button className="button button-primary" onClick={() => setShowCreateForm(true)} type="button">
                Create household
              </button>
            )
          }
          description={
            hasFilters
              ? "Try a broader search or reset the status filter."
              : "Create the first household to start linking members into household records."
          }
          title={
            hasFilters
              ? "No households matched the current filters"
              : "No households have been created yet"
          }
        />
      ) : null}

      {!householdsQuery.isLoading && !householdsQuery.error && households.length > 0 ? (
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <EntityTable
            columns={[
              {
                header: "Household",
                cell: (household) => (
                  <div className="grid gap-1">
                    <Link className="font-semibold text-[#16335f] hover:underline" href={`/households/${household.id}`}>
                      {household.name}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {household.primary_phone || household.city || "Profile-only record"}
                    </span>
                  </div>
                ),
              },
              {
                header: "Phone",
                cell: (household) => household.primary_phone || "—",
              },
              {
                header: "City",
                cell: (household) => household.city || "—",
              },
              {
                header: "Members",
                cell: (household) => household.active_member_count,
              },
              {
                header: "Status",
                cell: (household) => (
                  <StatusBadge
                    label={household.is_active ? "Active" : "Inactive"}
                    tone={household.is_active ? "success" : "muted"}
                  />
                ),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (household) => (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link className="button button-secondary button-compact" href={`/households/${household.id}`}>
                      Manage
                    </Link>
                  </div>
                ),
              },
            ]}
            getRowKey={(household) => household.id}
            rows={households}
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
