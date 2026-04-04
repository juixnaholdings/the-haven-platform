"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { queryClient } from "@/api/queryClient";
import {
  EmptyState,
  EntityTable,
  ErrorAlert,
  ErrorState,
  FormModalShell,
  FormSection,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components";
import { householdsApi } from "@/domains/households/api";
import { HOUSEHOLD_RELATIONSHIP_OPTIONS } from "@/domains/households/options";
import { membersApi } from "@/domains/members/api";
import type {
  HouseholdMembershipCreatePayload,
  HouseholdMembershipUpdatePayload,
  HouseholdWritePayload,
} from "@/domains/types";
import { formatDate, formatDateTime } from "@/lib/formatters";

interface HouseholdFormState {
  name: string;
  primary_phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  notes: string;
  is_active: boolean;
}

interface AddMemberFormState {
  member_id: string;
  relationship_to_head: string;
  is_head: boolean;
  joined_on: string;
  left_on: string;
  notes: string;
}

interface MembershipFormState {
  relationship_to_head: string;
  is_head: boolean;
  is_active: boolean;
  joined_on: string;
  left_on: string;
  notes: string;
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

const emptyAddMemberForm: AddMemberFormState = {
  member_id: "",
  relationship_to_head: "OTHER",
  is_head: false,
  joined_on: "",
  left_on: "",
  notes: "",
};

const emptyMembershipForm: MembershipFormState = {
  relationship_to_head: "OTHER",
  is_head: false,
  is_active: true,
  joined_on: "",
  left_on: "",
  notes: "",
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

function toAddMemberPayload(formState: AddMemberFormState): HouseholdMembershipCreatePayload {
  return {
    member_id: Number(formState.member_id),
    relationship_to_head: formState.relationship_to_head,
    is_head: formState.is_head,
    joined_on: formState.joined_on || null,
    left_on: formState.left_on || null,
    notes: formState.notes || undefined,
  };
}

function toMembershipPayload(formState: MembershipFormState): HouseholdMembershipUpdatePayload {
  return {
    relationship_to_head: formState.relationship_to_head,
    is_head: formState.is_head,
    is_active: formState.is_active,
    joined_on: formState.joined_on || null,
    left_on: formState.left_on || null,
    notes: formState.notes || undefined,
  };
}

function getMemberDisplayName(member: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
}) {
  return [member.first_name, member.middle_name, member.last_name].filter(Boolean).join(" ");
}

export function HouseholdDetailPageScreen() {
  const params = useParams<{ householdId: string }>();
  const numericHouseholdId = Number(params.householdId);
  const [isEditHouseholdModalOpen, setIsEditHouseholdModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [householdFormOverrides, setHouseholdFormOverrides] = useState<Partial<HouseholdFormState>>({});
  const [memberSearch, setMemberSearch] = useState("");
  const [addMemberFormState, setAddMemberFormState] = useState<AddMemberFormState>(emptyAddMemberForm);
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null);
  const [membershipFormOverrides, setMembershipFormOverrides] = useState<
    Partial<MembershipFormState>
  >({});
  const deferredMemberSearch = useDeferredValue(memberSearch);

  const householdQuery = useQuery({
    enabled: Number.isFinite(numericHouseholdId),
    queryKey: ["household", numericHouseholdId],
    queryFn: () => householdsApi.getHousehold(numericHouseholdId),
  });

  const baseHouseholdFormState = useMemo<HouseholdFormState>(() => {
    if (!householdQuery.data) {
      return emptyHouseholdForm;
    }

    return {
      name: householdQuery.data.name,
      primary_phone: householdQuery.data.primary_phone || "",
      address_line_1: householdQuery.data.address_line_1 || "",
      address_line_2: householdQuery.data.address_line_2 || "",
      city: householdQuery.data.city || "",
      notes: householdQuery.data.notes || "",
      is_active: householdQuery.data.is_active,
    };
  }, [householdQuery.data]);

  const householdFormState = useMemo<HouseholdFormState>(
    () => ({
      ...baseHouseholdFormState,
      ...householdFormOverrides,
    }),
    [baseHouseholdFormState, householdFormOverrides],
  );

  const candidateMembersQuery = useQuery({
    enabled: Number.isFinite(numericHouseholdId),
    queryKey: ["members", "household-candidates", { search: deferredMemberSearch }],
    queryFn: () =>
      membersApi.listMembers({
        search: deferredMemberSearch || undefined,
        is_active: true,
      }),
  });

  const activeMemberIds = useMemo(
    () =>
      new Set(
        (householdQuery.data?.members ?? [])
          .filter((membership) => membership.is_active)
          .map((membership) => membership.member_id),
      ),
    [householdQuery.data?.members],
  );

  const candidateMembers = (candidateMembersQuery.data ?? []).filter(
    (member) => !activeMemberIds.has(member.id),
  );

  const selectedMembership =
    householdQuery.data?.members.find((membership) => membership.id === selectedMembershipId) ?? null;

  const baseMembershipFormState = useMemo<MembershipFormState>(() => {
    if (!selectedMembership) {
      return emptyMembershipForm;
    }

    return {
      relationship_to_head: selectedMembership.relationship_to_head,
      is_head: selectedMembership.is_head,
      is_active: selectedMembership.is_active,
      joined_on: selectedMembership.joined_on || "",
      left_on: selectedMembership.left_on || "",
      notes: selectedMembership.notes || "",
    };
  }, [selectedMembership]);

  const membershipFormState = useMemo<MembershipFormState>(
    () => ({
      ...baseMembershipFormState,
      ...membershipFormOverrides,
    }),
    [baseMembershipFormState, membershipFormOverrides],
  );

  const updateHouseholdMutation = useMutation({
    mutationFn: (payload: Partial<HouseholdWritePayload>) =>
      householdsApi.updateHousehold(numericHouseholdId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["households"] });
      await queryClient.invalidateQueries({ queryKey: ["household", numericHouseholdId] });
      setHouseholdFormOverrides({});
      setIsEditHouseholdModalOpen(false);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload: HouseholdMembershipCreatePayload) =>
      householdsApi.addMember(numericHouseholdId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["household", numericHouseholdId] });
      await queryClient.invalidateQueries({ queryKey: ["households"] });
      setAddMemberFormState(emptyAddMemberForm);
      setMemberSearch("");
      setIsAddMemberModalOpen(false);
    },
  });

  const updateMembershipMutation = useMutation({
    mutationFn: (payload: HouseholdMembershipUpdatePayload) => {
      if (!selectedMembershipId) {
        throw new Error("No household membership selected.");
      }

      return householdsApi.updateMembership(numericHouseholdId, selectedMembershipId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["household", numericHouseholdId] });
      await queryClient.invalidateQueries({ queryKey: ["households"] });
      setMembershipFormOverrides({});
      setSelectedMembershipId(null);
    },
  });

  if (!Number.isFinite(numericHouseholdId)) {
    return (
      <ErrorState
        description="The requested household identifier is not valid."
        error={new Error("Invalid household identifier.")}
        title="Household route is invalid"
      />
    );
  }

  if (householdQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching the household profile and its current member memberships."
        title="Loading household"
      />
    );
  }

  if (householdQuery.error || !householdQuery.data) {
    return (
      <ErrorState
        error={householdQuery.error ?? new Error("Household not found.")}
        onRetry={() => {
          void householdQuery.refetch();
        }}
        title="Household could not be loaded"
      />
    );
  }

  const household = householdQuery.data;
  const activeMembershipCount = household.members.filter((membership) => membership.is_active).length;
  const headCount = household.members.filter(
    (membership) => membership.is_head && membership.is_active,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              onClick={() => setIsEditHouseholdModalOpen(true)}
              type="button"
            >
              Edit household
            </button>
            <button
              className="button button-secondary"
              onClick={() => setIsAddMemberModalOpen(true)}
              type="button"
            >
              Add member
            </button>
            <Link className="button button-ghost" href="/households">
              Back to households
            </Link>
          </div>
        }
        description="Use this operational view to maintain the household profile and keep household memberships current. No destructive delete flow is exposed in the current backend."
        eyebrow="Household management"
        meta={
          <>
            <StatusBadge
              label={household.is_active ? "Active household" : "Inactive household"}
              tone={household.is_active ? "success" : "muted"}
            />
            <StatusBadge
              label={`${activeMembershipCount} active member${activeMembershipCount === 1 ? "" : "s"}`}
              tone="info"
            />
          </>
        }
        title={household.name}
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active members" tone="accent" value={activeMembershipCount} />
        <StatCard label="Household heads" value={headCount} />
        <StatCard label="City" value={household.city || "Not set"} />
        <StatCard label="Created" value={formatDate(household.created_at)} />
      </section>

      <div className="grid gap-4 items-start grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <section className="space-y-6">
          <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
            <div className="section-header">
              <div>
                <h3>Profile</h3>
                <p className="m-0 text-sm text-slate-500">
                  Core household fields from the current backend payload.
                </p>
              </div>
            </div>
            <dl className="grid gap-3.5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Primary phone</dt>
                <dd>{household.primary_phone || "Not set"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>City</dt>
                <dd>{household.city || "Not set"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Address line 1</dt>
                <dd>{household.address_line_1 || "Not set"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Address line 2</dt>
                <dd>{household.address_line_2 || "Not set"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
            <div className="section-header">
              <div>
                <h3>Notes</h3>
                <p className="m-0 text-sm text-slate-500">Household-level operational notes only.</p>
              </div>
            </div>
            <p className="m-0 whitespace-pre-wrap text-sm text-slate-600">{household.notes || "No notes recorded for this household."}</p>
          </section>
        </section>

        <section className="space-y-6">
          <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
            <div className="section-header">
              <div>
                <h3>Record metadata</h3>
                <p className="m-0 text-sm text-slate-500">Current household status and audit timestamps.</p>
              </div>
            </div>
            <dl className="grid gap-3.5 grid-cols-1">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Status</dt>
                <dd>
                  <StatusBadge
                    label={household.is_active ? "Active" : "Inactive"}
                    tone={household.is_active ? "success" : "muted"}
                  />
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Created</dt>
                <dd>{formatDateTime(household.created_at)}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Last updated</dt>
                <dd>{formatDateTime(household.updated_at)}</dd>
              </div>
            </dl>
          </section>
        </section>
      </div>

      <FormModalShell
        description="This edit form writes directly to the current household patch endpoint."
        isOpen={isEditHouseholdModalOpen}
        onClose={() => {
          setHouseholdFormOverrides({});
          setIsEditHouseholdModalOpen(false);
        }}
        size="large"
        title="Update household"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            updateHouseholdMutation.mutate(toHouseholdPayload(householdFormState));
          }}
        >
          <FormSection title="Household details">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Household name</span>
                <input
                  onChange={(event) =>
                    setHouseholdFormOverrides((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                  value={householdFormState.name}
                />
              </label>

              <label className="field">
                <span>Primary phone</span>
                <input
                  onChange={(event) =>
                    setHouseholdFormOverrides((current) => ({
                      ...current,
                      primary_phone: event.target.value,
                    }))
                  }
                  value={householdFormState.primary_phone}
                />
              </label>

              <label className="field">
                <span>City</span>
                <input
                  onChange={(event) =>
                    setHouseholdFormOverrides((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  value={householdFormState.city}
                />
              </label>

              <label className="field">
                <span>Address line 1</span>
                <input
                  onChange={(event) =>
                    setHouseholdFormOverrides((current) => ({
                      ...current,
                      address_line_1: event.target.value,
                    }))
                  }
                  value={householdFormState.address_line_1}
                />
              </label>

              <label className="field">
                <span>Address line 2</span>
                <input
                  onChange={(event) =>
                    setHouseholdFormOverrides((current) => ({
                      ...current,
                      address_line_2: event.target.value,
                    }))
                  }
                  value={householdFormState.address_line_2}
                />
              </label>

              <label className="checkbox-field checkbox-field-inline">
                <input
                  checked={householdFormState.is_active}
                  onChange={(event) =>
                    setHouseholdFormOverrides((current) => ({
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
                  setHouseholdFormOverrides((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={4}
                value={householdFormState.notes}
              />
            </label>
          </FormSection>

          <ErrorAlert error={updateHouseholdMutation.error} fallbackMessage="The household could not be updated." />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              disabled={updateHouseholdMutation.isPending}
              type="submit"
            >
              {updateHouseholdMutation.isPending ? "Saving..." : "Save household changes"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setHouseholdFormOverrides({});
                setIsEditHouseholdModalOpen(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModalShell>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Household members</h3>
            <p className="m-0 text-sm text-slate-500">
              Existing memberships can be updated below. Destructive removal is intentionally not
              exposed; use active state and dates instead.
            </p>
          </div>
          <button
            className="button button-secondary button-compact"
            onClick={() => setIsAddMemberModalOpen(true)}
            type="button"
          >
            Add member
          </button>
        </div>

        {household.members.length === 0 ? (
          <EmptyState
            description="Use the Add member action to start building the household record."
            title="No household memberships yet"
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Member",
                cell: (membership) => (
                  <div className="grid gap-1">
                    <Link className="font-semibold text-[#16335f] hover:underline" href={`/members/${membership.member_id}`}>
                      {getMemberDisplayName(membership)}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {membership.email || membership.phone_number || "Profile-only record"}
                    </span>
                  </div>
                ),
              },
              {
                header: "Relationship",
                cell: (membership) => (
                  <div className="grid gap-1">
                    <span>{membership.relationship_to_head}</span>
                    {membership.is_head ? <StatusBadge label="Head" tone="info" /> : null}
                  </div>
                ),
              },
              {
                header: "Joined",
                cell: (membership) => formatDate(membership.joined_on),
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
              {
                header: "Actions",
                className: "cell-actions",
                cell: (membership) => (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      className={
                        selectedMembershipId === membership.id
                          ? "button button-secondary button-compact"
                          : "button button-ghost button-compact"
                      }
                      onClick={() => {
                        setSelectedMembershipId(membership.id);
                        setMembershipFormOverrides({});
                      }}
                      type="button"
                    >
                      {selectedMembershipId === membership.id ? "Editing" : "Edit membership"}
                    </button>
                  </div>
                ),
              },
            ]}
            getRowKey={(membership) => membership.id}
            rows={household.members}
          />
        )}
      </section>

      <FormModalShell
        description="Use the live member directory to assign an active member. The backend still enforces conflicting active household rules."
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setAddMemberFormState(emptyAddMemberForm);
          setMemberSearch("");
          setIsAddMemberModalOpen(false);
        }}
        size="large"
        title="Add member to household"
      >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          addMemberMutation.mutate(toAddMemberPayload(addMemberFormState));
        }}
      >
        <FormSection
          description="Use the live member directory to assign an active member. The backend still enforces conflicting active household rules."
          title="Add member to household"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">
              <span>Search member directory</span>
              <input
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search by name, email, or phone"
                value={memberSearch}
              />
            </label>

            <label className="field">
              <span>Choose member</span>
              <select
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    member_id: event.target.value,
                  }))
                }
                required
                value={addMemberFormState.member_id}
              >
                <option value="">Select a member</option>
                {candidateMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                    {member.email
                      ? ` · ${member.email}`
                      : member.phone_number
                        ? ` · ${member.phone_number}`
                        : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Relationship to head</span>
              <select
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    relationship_to_head: event.target.value,
                  }))
                }
                value={addMemberFormState.relationship_to_head}
              >
                {HOUSEHOLD_RELATIONSHIP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Joined on</span>
              <input
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    joined_on: event.target.value,
                  }))
                }
                type="date"
                value={addMemberFormState.joined_on}
              />
            </label>

            <label className="field">
              <span>Left on</span>
              <input
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    left_on: event.target.value,
                  }))
                }
                type="date"
                value={addMemberFormState.left_on}
              />
            </label>

            <label className="checkbox-field checkbox-field-inline">
              <input
                checked={addMemberFormState.is_head}
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    is_head: event.target.checked,
                    relationship_to_head:
                      event.target.checked && current.relationship_to_head === "OTHER"
                        ? "HEAD"
                        : current.relationship_to_head,
                  }))
                }
                type="checkbox"
              />
              <span>Set as household head</span>
            </label>
          </div>

          <label className="field">
            <span>Membership notes</span>
            <textarea
              onChange={(event) =>
                setAddMemberFormState((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={4}
              value={addMemberFormState.notes}
            />
          </label>

          <p className="m-0 text-sm text-slate-500">
            {candidateMembersQuery.isLoading
              ? "Loading candidate members..."
              : candidateMembers.length > 0
                ? `${candidateMembers.length} eligible member${candidateMembers.length === 1 ? "" : "s"} found.`
                : "No eligible members match the current search."}
          </p>
        </FormSection>

        <ErrorAlert
          error={addMemberMutation.error}
          fallbackMessage="The member could not be linked to this household."
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="button button-primary"
            disabled={addMemberMutation.isPending}
            type="submit"
          >
            {addMemberMutation.isPending ? "Adding..." : "Add member"}
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setAddMemberFormState(emptyAddMemberForm);
              setMemberSearch("");
              setIsAddMemberModalOpen(false);
            }}
            type="button"
          >
            Reset form
          </button>
        </div>
      </form>
      </FormModalShell>

      <FormModalShell
        description="Use this panel to keep household membership status, dates, and notes current."
        isOpen={Boolean(selectedMembership)}
        onClose={() => {
          setSelectedMembershipId(null);
          setMembershipFormOverrides({});
        }}
        size="large"
        title={selectedMembership ? `Edit membership: ${getMemberDisplayName(selectedMembership)}` : "Edit membership"}
      >
        {selectedMembership ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              updateMembershipMutation.mutate(toMembershipPayload(membershipFormState));
            }}
          >
            <FormSection title="Membership details">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="field">
                  <span>Relationship to head</span>
                  <select
                    onChange={(event) =>
                      setMembershipFormOverrides((current) => ({
                        ...current,
                        relationship_to_head: event.target.value,
                      }))
                    }
                    value={membershipFormState.relationship_to_head}
                  >
                    {HOUSEHOLD_RELATIONSHIP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Joined on</span>
                  <input
                    onChange={(event) =>
                      setMembershipFormOverrides((current) => ({
                        ...current,
                        joined_on: event.target.value,
                      }))
                    }
                    type="date"
                    value={membershipFormState.joined_on}
                  />
                </label>

                <label className="field">
                  <span>Left on</span>
                  <input
                    onChange={(event) =>
                      setMembershipFormOverrides((current) => ({
                        ...current,
                        left_on: event.target.value,
                      }))
                    }
                    type="date"
                    value={membershipFormState.left_on}
                  />
                </label>

                <div className="checkbox-group">
                  <label className="checkbox-field checkbox-field-inline">
                    <input
                      checked={membershipFormState.is_head}
                      onChange={(event) =>
                        setMembershipFormOverrides((current) => ({
                          ...current,
                          is_head: event.target.checked,
                          relationship_to_head:
                            event.target.checked && current.relationship_to_head === "OTHER"
                              ? "HEAD"
                              : current.relationship_to_head,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>Household head</span>
                  </label>

                  <label className="checkbox-field checkbox-field-inline">
                    <input
                      checked={membershipFormState.is_active}
                      onChange={(event) =>
                        setMembershipFormOverrides((current) => ({
                          ...current,
                          is_active: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>Membership is active</span>
                  </label>
                </div>
              </div>

              <label className="field">
                <span>Membership notes</span>
                <textarea
                  onChange={(event) =>
                    setMembershipFormOverrides((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  value={membershipFormState.notes}
                />
              </label>
            </FormSection>

            <ErrorAlert
              error={updateMembershipMutation.error}
              fallbackMessage="The household membership could not be updated."
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                className="button button-primary"
                disabled={updateMembershipMutation.isPending}
                type="submit"
              >
                {updateMembershipMutation.isPending ? "Saving..." : "Save membership"}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setSelectedMembershipId(null);
                  setMembershipFormOverrides({});
                }}
                type="button"
              >
                Close editor
              </button>
            </div>
          </form>
        ) : null}
      </FormModalShell>
    </div>
  );
}
