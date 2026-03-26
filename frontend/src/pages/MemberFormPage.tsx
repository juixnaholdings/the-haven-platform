import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { queryClient } from "../api/queryClient";
import { ErrorAlert } from "../components/ErrorAlert";
import { ErrorState } from "../components/ErrorState";
import { FormSection } from "../components/FormSection";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { membersApi } from "../domains/members/api";
import type { MemberWritePayload } from "../domains/types";

interface MemberFormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  notes: string;
  is_active: boolean;
}

const emptyMemberForm: MemberFormState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  date_of_birth: "",
  notes: "",
  is_active: true,
};

function toMemberPayload(formState: MemberFormState): MemberWritePayload {
  return {
    first_name: formState.first_name,
    middle_name: formState.middle_name || undefined,
    last_name: formState.last_name,
    email: formState.email || undefined,
    phone_number: formState.phone_number || undefined,
    date_of_birth: formState.date_of_birth || null,
    notes: formState.notes || undefined,
    is_active: formState.is_active,
  };
}

export function MemberFormPage() {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const numericMemberId = Number(memberId);
  const isEdit = Boolean(memberId);
  const [formState, setFormState] = useState<MemberFormState>(emptyMemberForm);

  const memberQuery = useQuery({
    enabled: isEdit && Number.isFinite(numericMemberId),
    queryKey: ["member", numericMemberId],
    queryFn: () => membersApi.getMember(numericMemberId),
  });

  useEffect(() => {
    if (!memberQuery.data) {
      return;
    }

    setFormState({
      first_name: memberQuery.data.first_name,
      middle_name: memberQuery.data.middle_name || "",
      last_name: memberQuery.data.last_name,
      email: memberQuery.data.email || "",
      phone_number: memberQuery.data.phone_number || "",
      date_of_birth: memberQuery.data.date_of_birth || "",
      notes: memberQuery.data.notes || "",
      is_active: memberQuery.data.is_active,
    });
  }, [memberQuery.data]);

  const saveMemberMutation = useMutation({
    mutationFn: async (payload: MemberWritePayload) => {
      if (isEdit) {
        return membersApi.updateMember(numericMemberId, payload);
      }

      return membersApi.createMember(payload);
    },
    onSuccess: async (member) => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["member", member.id] });
      navigate(`/members/${member.id}`, { replace: true });
    },
  });

  if (isEdit && !Number.isFinite(numericMemberId)) {
    return (
      <ErrorState
        title="Member route is invalid"
        description="The requested member identifier is not valid."
        error={new Error("Invalid member identifier.")}
      />
    );
  }

  if (isEdit && memberQuery.isLoading) {
    return <LoadingState title="Loading member editor" description="Preparing the current member record." />;
  }

  if (isEdit && (memberQuery.error || !memberQuery.data)) {
    return (
      <ErrorState
        title="Member editor could not be opened"
        error={memberQuery.error ?? new Error("Member not found.")}
        onRetry={() => {
          void memberQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Member profile"
        title={isEdit ? "Edit member" : "Create member"}
        description={
          isEdit
            ? "Update the core member profile fields currently supported by the backend."
            : "Create a new member profile using the real members API."
        }
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" to={isEdit ? `/members/${numericMemberId}` : "/members"}>
              Cancel
            </Link>
          </div>
        }
      />

      <form
        className="page-stack"
        onSubmit={(event) => {
          event.preventDefault();
          saveMemberMutation.mutate(toMemberPayload(formState));
        }}
      >
        <div className="content-grid content-grid-form">
          <div className="page-stack">
            <FormSection
              title="Core profile"
              description="These fields map directly to the current member profile payload exposed by the backend."
            >
              <div className="form-grid form-grid-2">
                <label className="field">
                  <span>First name</span>
                  <input
                    required
                    value={formState.first_name}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, first_name: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Middle name</span>
                  <input
                    value={formState.middle_name}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, middle_name: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Last name</span>
                  <input
                    required
                    value={formState.last_name}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, last_name: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Phone number</span>
                  <input
                    value={formState.phone_number}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, phone_number: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Date of birth</span>
                  <input
                    type="date"
                    value={formState.date_of_birth}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, date_of_birth: event.target.value }))
                    }
                  />
                </label>
              </div>
            </FormSection>

            <FormSection
              title="Operational notes"
              description="The backend currently stores profile notes and active state, but not related household or attendance history on this form."
            >
              <div className="form-grid">
                <label className="field">
                  <span>Notes</span>
                  <textarea
                    rows={5}
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>

                <label className="checkbox-field">
                  <input
                    checked={formState.is_active}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, is_active: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  <span>Member is active</span>
                </label>
              </div>
            </FormSection>

            <ErrorAlert
              error={saveMemberMutation.error}
              fallbackMessage="The member record could not be saved."
            />

            <div className="inline-actions">
              <button className="button button-primary" disabled={saveMemberMutation.isPending} type="submit">
                {saveMemberMutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create member"}
              </button>
              <Link className="button button-secondary" to={isEdit ? `/members/${numericMemberId}` : "/members"}>
                Cancel
              </Link>
            </div>
          </div>

          <aside className="page-stack">
            <section className="panel sticky-panel">
              <div className="panel-header">
                <div>
                  <h3>Record status</h3>
                  <p className="muted-text">A quick summary of what this form controls today.</p>
                </div>
              </div>
              <div className="page-stack">
                <StatusBadge
                  label={formState.is_active ? "Active member" : "Inactive member"}
                  tone={formState.is_active ? "success" : "muted"}
                />
                <ul className="item-list">
                  <li className="item-row">
                    <div>
                      <strong>Included on this form</strong>
                      <span>Identity, contact fields, birth date, notes, and active state.</span>
                    </div>
                  </li>
                  <li className="item-row">
                    <div>
                      <strong>Not included here</strong>
                      <span>Household links, ministry affiliations, attendance history, and finance history.</span>
                    </div>
                  </li>
                </ul>
              </div>
            </section>
          </aside>
        </div>
      </form>
    </div>
  );
}
