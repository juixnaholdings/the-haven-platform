"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { queryClient } from "@/api/queryClient";
import {
  ErrorAlert,
  ErrorState,
  FormModalShell,
  FormSection,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components";
import { membersApi } from "@/domains/members/api";
import type { MemberDetail, MemberWritePayload } from "@/domains/types";

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

interface MemberFormScreenProps {
  memberId?: number;
  mode?: "page" | "modal";
  onCancel?: () => void;
  onSuccess?: (member: MemberDetail) => void;
}

export function MemberFormScreen({
  memberId,
  mode = "page",
  onCancel,
  onSuccess,
}: MemberFormScreenProps) {
  const router = useRouter();
  const isEdit = Number.isFinite(memberId);
  const isModal = mode === "modal";
  const formId = useMemo(
    () => (isEdit ? `member-edit-form-${memberId}` : "member-create-form"),
    [isEdit, memberId],
  );
  const [formOverrides, setFormOverrides] = useState<Partial<MemberFormState>>({});

  const memberQuery = useQuery({
    enabled: isEdit,
    queryKey: ["member", memberId],
    queryFn: () => membersApi.getMember(memberId as number),
  });

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    router.replace(isEdit ? `/members/${memberId}` : "/members");
  };

  const baseFormState = useMemo<MemberFormState>(() => {
    if (!isEdit || !memberQuery.data) {
      return emptyMemberForm;
    }

    return {
      first_name: memberQuery.data.first_name,
      middle_name: memberQuery.data.middle_name || "",
      last_name: memberQuery.data.last_name,
      email: memberQuery.data.email || "",
      phone_number: memberQuery.data.phone_number || "",
      date_of_birth: memberQuery.data.date_of_birth || "",
      notes: memberQuery.data.notes || "",
      is_active: memberQuery.data.is_active,
    };
  }, [isEdit, memberQuery.data]);

  const formState: MemberFormState = useMemo(
    () => ({
      ...baseFormState,
      ...formOverrides,
    }),
    [baseFormState, formOverrides],
  );
  const isSubmitGuarded = !formState.first_name.trim() || !formState.last_name.trim();

  const saveMemberMutation = useMutation({
    mutationFn: async (payload: MemberWritePayload) => {
      if (isEdit) {
        return membersApi.updateMember(memberId as number, payload);
      }

      return membersApi.createMember(payload);
    },
    onSuccess: async (member) => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["member", member.id] });

      if (onSuccess) {
        onSuccess(member);
        return;
      }

      router.replace(`/members/${member.id}`);
    },
  });

  if (isEdit && memberQuery.isLoading) {
    const loadingState = (
      <LoadingState
        description="Preparing the current member record."
        title="Loading member editor"
      />
    );

    if (!isModal) {
      return loadingState;
    }

    return (
      <FormModalShell
        description="Preparing the selected member profile."
        isOpen
        onClose={handleCancel}
        size="medium"
        title="Loading member editor"
      >
        {loadingState}
      </FormModalShell>
    );
  }

  if (isEdit && (memberQuery.error || !memberQuery.data)) {
    const errorState = (
      <ErrorState
        error={memberQuery.error ?? new Error("Member not found.")}
        onRetry={() => {
          void memberQuery.refetch();
        }}
        title="Member editor could not be opened"
      />
    );

    if (!isModal) {
      return errorState;
    }

    return (
      <FormModalShell
        description="The editor could not be opened."
        isOpen
        onClose={handleCancel}
        size="medium"
        title="Member editor error"
      >
        {errorState}
      </FormModalShell>
    );
  }

  const memberForm = (
    <form
      className="space-y-6"
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        saveMemberMutation.mutate(toMemberPayload(formState));
      }}
    >
      <FormSection
        description="These fields map directly to the current member profile payload exposed by the backend."
        title="Core profile"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="field">
            <span>First name</span>
            <input
              onChange={(event) =>
                setFormOverrides((current) => ({ ...current, first_name: event.target.value }))
              }
              required
              value={formState.first_name}
            />
          </label>

          <label className="field">
            <span>Middle name</span>
            <input
              onChange={(event) =>
                setFormOverrides((current) => ({ ...current, middle_name: event.target.value }))
              }
              value={formState.middle_name}
            />
          </label>

          <label className="field">
            <span>Last name</span>
            <input
              onChange={(event) =>
                setFormOverrides((current) => ({ ...current, last_name: event.target.value }))
              }
              required
              value={formState.last_name}
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              onChange={(event) =>
                setFormOverrides((current) => ({ ...current, email: event.target.value }))
              }
              type="email"
              value={formState.email}
            />
          </label>

          <label className="field">
            <span>Phone number</span>
            <input
              onChange={(event) =>
                setFormOverrides((current) => ({ ...current, phone_number: event.target.value }))
              }
              value={formState.phone_number}
            />
          </label>

          <label className="field">
            <span>Date of birth</span>
            <input
              onChange={(event) =>
                setFormOverrides((current) => ({ ...current, date_of_birth: event.target.value }))
              }
              type="date"
              value={formState.date_of_birth}
            />
          </label>
        </div>
      </FormSection>

      <FormSection
        description="The backend currently stores profile notes and active state, but not related household or attendance history on this form."
        title="Operational notes"
      >
        <div className="grid gap-4">
          <label className="field">
            <span>Notes</span>
            <textarea
              onChange={(event) =>
                setFormOverrides((current) => ({ ...current, notes: event.target.value }))
              }
              rows={5}
              value={formState.notes}
            />
          </label>

          <label className="checkbox-field">
            <input
              checked={formState.is_active}
              onChange={(event) =>
                setFormOverrides((current) => ({ ...current, is_active: event.target.checked }))
              }
              type="checkbox"
            />
            <span>Member is active</span>
          </label>
        </div>
      </FormSection>

      {!isModal ? (
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Record status</h3>
              <p className="m-0 text-sm text-slate-500">A quick summary of what this form controls today.</p>
            </div>
          </div>
          <div className="space-y-6">
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
                  <span>
                    Household links, ministry affiliations, attendance history, and finance history.
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </section>
      ) : null}

      <ErrorAlert
        error={saveMemberMutation.error}
        fallbackMessage="The member record could not be saved."
      />

      {!isModal ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="button button-primary"
            disabled={saveMemberMutation.isPending || isSubmitGuarded}
            type="submit"
          >
            {saveMemberMutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create member"}
          </button>
          <button className="button button-secondary" onClick={handleCancel} type="button">
            Cancel
          </button>
        </div>
      ) : null}
    </form>
  );

  if (isModal) {
    return (
      <FormModalShell
        description={
          isEdit
            ? "Update the core member profile fields currently supported by the backend."
            : "Create a new member profile using the real members API."
        }
        footer={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              disabled={saveMemberMutation.isPending || isSubmitGuarded}
              form={formId}
              type="submit"
            >
              {saveMemberMutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create member"}
            </button>
            <button className="button button-secondary" onClick={handleCancel} type="button">
              Cancel
            </button>
          </div>
        }
        isOpen
        onClose={handleCancel}
        size="large"
        title={isEdit ? "Edit member" : "Create member"}
      >
        {memberForm}
      </FormModalShell>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link className="button button-secondary" href={isEdit ? `/members/${memberId}` : "/members"}>
              Cancel
            </Link>
          </div>
        }
        description={
          isEdit
            ? "Update the core member profile fields currently supported by the backend."
            : "Create a new member profile using the real members API."
        }
        eyebrow="Member profile"
        title={isEdit ? "Edit member" : "Create member"}
      />
      {memberForm}
    </div>
  );
}
