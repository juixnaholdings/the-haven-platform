import { useDeferredValue, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { queryClient } from "../api/queryClient";
import { ErrorAlert } from "../components/ErrorAlert";
import { EmptyState } from "../components/EmptyState";
import { EntityTable } from "../components/EntityTable";
import { ErrorState } from "../components/ErrorState";
import { FormSection } from "../components/FormSection";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { householdsApi } from "../domains/households/api";
import { HOUSEHOLD_RELATIONSHIP_OPTIONS } from "../domains/households/options";
import { membersApi } from "../domains/members/api";
import type {
  HouseholdMembershipCreatePayload,
  HouseholdMembershipUpdatePayload,
  HouseholdWritePayload,
} from "../domains/types";
import { formatDate, formatDateTime } from "../utils/formatters";

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

export function HouseholdDetailPage() {
  const { householdId } = useParams();
  const numericHouseholdId = Number(householdId);
  const [householdFormState, setHouseholdFormState] =
    useState<HouseholdFormState>(emptyHouseholdForm);
  const [memberSearch, setMemberSearch] = useState("");
  const [addMemberFormState, setAddMemberFormState] =
    useState<AddMemberFormState>(emptyAddMemberForm);
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null);
  const [membershipFormState, setMembershipFormState] =
    useState<MembershipFormState>(emptyMembershipForm);
  const deferredMemberSearch = useDeferredValue(memberSearch);

  const householdQuery = useQuery({
    enabled: Number.isFinite(numericHouseholdId),
    queryKey: ["household", numericHouseholdId],
    queryFn: () => householdsApi.getHousehold(numericHouseholdId),
  });

  useEffect(() => {
    if (!householdQuery.data) {
      return;
    }

    setHouseholdFormState({
      name: householdQuery.data.name,
      primary_phone: householdQuery.data.primary_phone || "",
      address_line_1: householdQuery.data.address_line_1 || "",
      address_line_2: householdQuery.data.address_line_2 || "",
      city: householdQuery.data.city || "",
      notes: householdQuery.data.notes || "",
      is_active: householdQuery.data.is_active,
    });
  }, [householdQuery.data]);

  const candidateMembersQuery = useQuery({
    enabled: Number.isFinite(numericHouseholdId),
    queryKey: ["members", "household-candidates", { search: deferredMemberSearch }],
    queryFn: () =>
      membersApi.listMembers({
        search: deferredMemberSearch || undefined,
        is_active: true,
      }),
  });

  const activeMemberIds = new Set(
    (householdQuery.data?.members ?? [])
      .filter((membership) => membership.is_active)
      .map((membership) => membership.member_id),
  );

  const candidateMembers = (candidateMembersQuery.data ?? []).filter(
    (member) => !activeMemberIds.has(member.id),
  );

  const selectedMembership =
    householdQuery.data?.members.find((membership) => membership.id === selectedMembershipId) ??
    null;

  useEffect(() => {
    if (!selectedMembership) {
      setMembershipFormState(emptyMembershipForm);
      return;
    }

    setMembershipFormState({
      relationship_to_head: selectedMembership.relationship_to_head,
      is_head: selectedMembership.is_head,
      is_active: selectedMembership.is_active,
      joined_on: selectedMembership.joined_on || "",
      left_on: selectedMembership.left_on || "",
      notes: selectedMembership.notes || "",
    });
  }, [selectedMembership]);

  const updateHouseholdMutation = useMutation({
    mutationFn: (payload: Partial<HouseholdWritePayload>) =>
      householdsApi.updateHousehold(numericHouseholdId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["households"] });
      await queryClient.invalidateQueries({ queryKey: ["household", numericHouseholdId] });
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
    },
  });

  const updateMembershipMutation = useMutation({
    mutationFn: (payload: HouseholdMembershipUpdatePayload) => {
      if (!selectedMembershipId) {
        throw new Error("No household membership selected.");
      }

      return householdsApi.updateMembership(
        numericHouseholdId,
        selectedMembershipId,
        payload,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["household", numericHouseholdId] });
      await queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });

  if (!Number.isFinite(numericHouseholdId)) {
    return (
      <ErrorState
        title="Household route is invalid"
        description="The requested household identifier is not valid."
        error={new Error("Invalid household identifier.")}
      />
    );
  }

  if (householdQuery.isLoading) {
    return (
      <LoadingState
        title="Loading household"
        description="Fetching the household profile and its current member memberships."
      />
    );
  }

  if (householdQuery.error || !householdQuery.data) {
    return (
      <ErrorState
        title="Household could not be loaded"
        error={householdQuery.error ?? new Error("Household not found.")}
        onRetry={() => {
          void householdQuery.refetch();
        }}
      />
    );
  }

  const household = householdQuery.data;
  const activeMembershipCount = household.members.filter((membership) => membership.is_active).length;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Household management"
        title={household.name}
        description="Use this operational view to maintain the household profile and keep household memberships current. No destructive delete flow is exposed in the current backend."
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" to="/households">
              Back to households
            </Link>
          </div>
        }
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
      />

      <div className="content-grid">
        <section className="page-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Profile</h3>
                <p className="muted-text">Core household fields from the current backend payload.</p>
              </div>
            </div>
            <dl className="detail-grid detail-grid-2">
              <div className="detail-item">
                <dt>Primary phone</dt>
                <dd>{household.primary_phone || "Not set"}</dd>
              </div>
              <div className="detail-item">
                <dt>City</dt>
                <dd>{household.city || "Not set"}</dd>
              </div>
              <div className="detail-item">
                <dt>Address line 1</dt>
                <dd>{household.address_line_1 || "Not set"}</dd>
              </div>
              <div className="detail-item">
                <dt>Address line 2</dt>
                <dd>{household.address_line_2 || "Not set"}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Notes</h3>
                <p className="muted-text">Household-level operational notes only.</p>
              </div>
            </div>
            <p className="panel-copy">{household.notes || "No notes recorded for this household."}</p>
          </section>
        </section>

        <section className="page-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Record metadata</h3>
                <p className="muted-text">Current household status and audit timestamps.</p>
              </div>
            </div>
            <dl className="detail-grid detail-grid-1">
              <div className="detail-item">
                <dt>Status</dt>
                <dd>
                  <StatusBadge
                    label={household.is_active ? "Active" : "Inactive"}
                    tone={household.is_active ? "success" : "muted"}
                  />
                </dd>
              </div>
              <div className="detail-item">
                <dt>Created</dt>
                <dd>{formatDateTime(household.created_at)}</dd>
              </div>
              <div className="detail-item">
                <dt>Last updated</dt>
                <dd>{formatDateTime(household.updated_at)}</dd>
              </div>
            </dl>
          </section>
        </section>
      </div>

      <form
        className="page-stack"
        onSubmit={(event) => {
          event.preventDefault();
          updateHouseholdMutation.mutate(toHouseholdPayload(householdFormState));
        }}
      >
        <FormSection
          title="Update household"
          description="This edit form writes directly to the current household patch endpoint."
        >
          <div className="form-grid form-grid-2">
            <label className="field">
              <span>Household name</span>
              <input
                required
                value={householdFormState.name}
                onChange={(event) =>
                  setHouseholdFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Primary phone</span>
              <input
                value={householdFormState.primary_phone}
                onChange={(event) =>
                  setHouseholdFormState((current) => ({
                    ...current,
                    primary_phone: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>City</span>
              <input
                value={householdFormState.city}
                onChange={(event) =>
                  setHouseholdFormState((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Address line 1</span>
              <input
                value={householdFormState.address_line_1}
                onChange={(event) =>
                  setHouseholdFormState((current) => ({
                    ...current,
                    address_line_1: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Address line 2</span>
              <input
                value={householdFormState.address_line_2}
                onChange={(event) =>
                  setHouseholdFormState((current) => ({
                    ...current,
                    address_line_2: event.target.value,
                  }))
                }
              />
            </label>

            <label className="checkbox-field checkbox-field-inline">
              <input
                checked={householdFormState.is_active}
                onChange={(event) =>
                  setHouseholdFormState((current) => ({
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
              rows={4}
              value={householdFormState.notes}
              onChange={(event) =>
                setHouseholdFormState((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
        </FormSection>

        <ErrorAlert
          error={updateHouseholdMutation.error}
          fallbackMessage="The household could not be updated."
        />

        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={updateHouseholdMutation.isPending}
            type="submit"
          >
            {updateHouseholdMutation.isPending ? "Saving..." : "Save household changes"}
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Household members</h3>
            <p className="muted-text">
              Existing memberships can be updated below. Destructive removal is intentionally not
              exposed; use active state and dates instead.
            </p>
          </div>
        </div>

        {household.members.length === 0 ? (
          <EmptyState
            title="No household memberships yet"
            description="Add a member below to start building the household record."
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Member",
                cell: (membership) => (
                  <div className="cell-stack">
                    <Link className="table-link" to={`/members/${membership.member_id}`}>
                      {getMemberDisplayName(membership)}
                    </Link>
                    <span className="table-subtext">
                      {membership.email || membership.phone_number || "Profile-only record"}
                    </span>
                  </div>
                ),
              },
              {
                header: "Relationship",
                cell: (membership) => (
                  <div className="cell-stack">
                    <span>{membership.relationship_to_head}</span>
                    {membership.is_head ? (
                      <StatusBadge label="Head" tone="info" />
                    ) : null}
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
                  <div className="inline-actions">
                    <button
                      className={
                        selectedMembershipId === membership.id
                          ? "button button-secondary button-compact"
                          : "button button-ghost button-compact"
                      }
                      onClick={() => setSelectedMembershipId(membership.id)}
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

      <form
        className="page-stack"
        onSubmit={(event) => {
          event.preventDefault();
          addMemberMutation.mutate(toAddMemberPayload(addMemberFormState));
        }}
      >
        <FormSection
          title="Add member to household"
          description="Use the live member directory to assign an active member. The backend still enforces conflicting active household rules."
        >
          <div className="form-grid form-grid-2">
            <label className="field">
              <span>Search member directory</span>
              <input
                placeholder="Search by name, email, or phone"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Choose member</span>
              <select
                required
                value={addMemberFormState.member_id}
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    member_id: event.target.value,
                  }))
                }
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
                value={addMemberFormState.relationship_to_head}
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    relationship_to_head: event.target.value,
                  }))
                }
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
                type="date"
                value={addMemberFormState.joined_on}
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    joined_on: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Left on</span>
              <input
                type="date"
                value={addMemberFormState.left_on}
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    left_on: event.target.value,
                  }))
                }
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
              rows={4}
              value={addMemberFormState.notes}
              onChange={(event) =>
                setAddMemberFormState((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>

          <p className="muted-text helper-text">
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

        <div className="inline-actions">
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
            }}
            type="button"
          >
            Reset form
          </button>
        </div>
      </form>

      {selectedMembership ? (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            updateMembershipMutation.mutate(toMembershipPayload(membershipFormState));
          }}
        >
          <FormSection
            title={`Edit membership: ${getMemberDisplayName(selectedMembership)}`}
            description="Use this panel to keep household membership status, dates, and notes current."
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Relationship to head</span>
                <select
                  value={membershipFormState.relationship_to_head}
                  onChange={(event) =>
                    setMembershipFormState((current) => ({
                      ...current,
                      relationship_to_head: event.target.value,
                    }))
                  }
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
                  type="date"
                  value={membershipFormState.joined_on}
                  onChange={(event) =>
                    setMembershipFormState((current) => ({
                      ...current,
                      joined_on: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Left on</span>
                <input
                  type="date"
                  value={membershipFormState.left_on}
                  onChange={(event) =>
                    setMembershipFormState((current) => ({
                      ...current,
                      left_on: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="checkbox-group">
                <label className="checkbox-field checkbox-field-inline">
                  <input
                    checked={membershipFormState.is_head}
                    onChange={(event) =>
                      setMembershipFormState((current) => ({
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
                      setMembershipFormState((current) => ({
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
                rows={4}
                value={membershipFormState.notes}
                onChange={(event) =>
                  setMembershipFormState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </FormSection>

          <ErrorAlert
            error={updateMembershipMutation.error}
            fallbackMessage="The household membership could not be updated."
          />

          <div className="inline-actions">
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
                setMembershipFormState(emptyMembershipForm);
              }}
              type="button"
            >
              Close editor
            </button>
          </div>
        </form>
      ) : (
        <EmptyState
          title="No membership selected"
          description="Choose a household member from the table above to edit relationship, dates, notes, or active status."
        />
      )}
    </div>
  );
}
