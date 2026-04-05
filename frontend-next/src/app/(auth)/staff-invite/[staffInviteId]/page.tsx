"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { formatApiErrors, isApiError } from "@/api/errors";
import { ButtonLoadingContent } from "@/components";
import { ErrorAlert } from "@/components/ErrorAlert";
import { authApi } from "@/domains/auth/api";


type InviteFieldName = "username" | "password" | "confirmPassword";
type InviteApiFieldName = "username" | "password" | "confirm_password";
type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable" | "error";

interface AvailabilityState {
  status: AvailabilityStatus;
  message: string;
}

type InviteFieldErrors = Partial<Record<InviteApiFieldName, string[]>>;

const USERNAME_PATTERN = /^[\w.@+-]+$/u;
const INVITE_FIELD_KEYS: InviteApiFieldName[] = ["username", "password", "confirm_password"];

function normalizeFieldMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (value == null) {
    return [];
  }

  return [String(value)];
}

function extractInviteFieldErrors(error: unknown): InviteFieldErrors {
  if (!isApiError(error) || !error.errors || typeof error.errors !== "object") {
    return {};
  }

  const collected: InviteFieldErrors = {};
  INVITE_FIELD_KEYS.forEach((fieldName) => {
    if (!(fieldName in error.errors)) {
      return;
    }

    const rawValue = (error.errors as Record<string, unknown>)[fieldName];
    const messages = normalizeFieldMessages(rawValue);
    if (messages.length) {
      collected[fieldName] = messages;
    }
  });

  return collected;
}

function hasNonFieldInviteErrors(error: unknown): boolean {
  if (!isApiError(error) || !error.errors || typeof error.errors !== "object") {
    return true;
  }

  const keys = Object.keys(error.errors);
  if (!keys.length) {
    return true;
  }

  return keys.some((key) => !INVITE_FIELD_KEYS.includes(key as InviteApiFieldName));
}

function buildPasswordChecks(password: string) {
  return [
    {
      key: "length",
      label: "At least 8 characters",
      passed: password.length >= 8,
    },
    {
      key: "uppercase",
      label: "Contains an uppercase letter",
      passed: /[A-Z]/.test(password),
    },
    {
      key: "lowercase",
      label: "Contains a lowercase letter",
      passed: /[a-z]/.test(password),
    },
    {
      key: "number",
      label: "Contains a number",
      passed: /[0-9]/.test(password),
    },
    {
      key: "symbol",
      label: "Contains a symbol",
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

function getAvailabilityFeedbackClass(status: AvailabilityStatus): string {
  if (status === "available") {
    return "field-feedback-success";
  }
  if (status === "checking") {
    return "field-feedback-info";
  }
  if (status === "unavailable" || status === "error") {
    return "field-feedback-error";
  }

  return "field-feedback-info";
}

export default function StaffInviteOnboardingPage() {
  const params = useParams<{ staffInviteId: string }>();
  const searchParams = useSearchParams();
  const rawInviteId = params?.staffInviteId;
  const inviteId = Number(rawInviteId);
  const token = searchParams.get("token")?.trim() ?? "";

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Record<InviteFieldName, boolean>>({
    username: false,
    password: false,
    confirmPassword: false,
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<InviteFieldErrors>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [usernameAvailability, setUsernameAvailability] = useState<AvailabilityState>({
    status: "idle",
    message: "",
  });
  const [isComplete, setIsComplete] = useState(false);
  const [createdUsername, setCreatedUsername] = useState("");

  const inviteQuery = useQuery({
    queryKey: ["auth", "staff-invite", inviteId, token],
    queryFn: () => authApi.validateStaffInvite(inviteId, token),
    enabled: Number.isInteger(inviteId) && inviteId > 0 && Boolean(token),
    retry: false,
  });

  const acceptInviteMutation = useMutation({
    mutationFn: () =>
      authApi.acceptStaffInvite(inviteId, {
        token,
        username: username.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        password,
        confirm_password: confirmPassword,
      }),
    onSuccess: (response) => {
      setCreatedUsername(response.user.username);
      setIsComplete(true);
    },
    onError: (error) => {
      const inviteFieldErrors = extractInviteFieldErrors(error);
      setFieldErrors(inviteFieldErrors);
      setSubmitError(hasNonFieldInviteErrors(error) ? error : null);
    },
  });

  const normalizedUsername = username.trim();
  const passwordChecks = useMemo(() => buildPasswordChecks(password), [password]);
  const passwordStrengthSatisfied = passwordChecks.every((check) => check.passed);

  const usernameClientError = useMemo(() => {
    if (!normalizedUsername) {
      return "Username is required.";
    }

    if (normalizedUsername.length > 150) {
      return "Username must be 150 characters or fewer.";
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return "Use letters, numbers, and @/./+/-/_ only.";
    }

    return undefined;
  }, [normalizedUsername]);

  const passwordClientError = useMemo(() => {
    if (!password) {
      return "Password is required.";
    }

    if (!passwordStrengthSatisfied) {
      return "Password must meet all required rules.";
    }

    return undefined;
  }, [password, passwordStrengthSatisfied]);

  const confirmPasswordClientError = useMemo(() => {
    if (!confirmPassword) {
      return "Confirm your password.";
    }

    if (confirmPassword !== password) {
      return "Passwords do not match.";
    }

    return undefined;
  }, [confirmPassword, password]);

  useEffect(() => {
    if (!normalizedUsername || usernameClientError) {
      return;
    }

    let isCancelled = false;
    const timerId = window.setTimeout(async () => {
      setUsernameAvailability({
        status: "checking",
        message: "Checking username availability...",
      });

      try {
        const response = await authApi.checkUsernameAvailability(normalizedUsername);
        if (isCancelled) {
          return;
        }

        setUsernameAvailability(
          response.available
            ? { status: "available", message: "Username is available." }
            : { status: "unavailable", message: "Username is already in use." },
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const details = formatApiErrors(error);
        setUsernameAvailability({
          status: "error",
          message: details[0] ?? "Could not validate username availability right now.",
        });
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timerId);
    };
  }, [normalizedUsername, usernameClientError]);

  function markTouched(field: InviteFieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function shouldShowFieldMessage(field: InviteFieldName): boolean {
    return touched[field] || hasSubmitted;
  }

  function getFieldError(field: InviteFieldName): string | undefined {
    if (field === "username") {
      return usernameClientError ?? fieldErrors.username?.[0];
    }
    if (field === "password") {
      return passwordClientError ?? fieldErrors.password?.[0];
    }

    return confirmPasswordClientError ?? fieldErrors.confirm_password?.[0];
  }

  const hasClientValidationErrors = Boolean(
    usernameClientError || passwordClientError || confirmPasswordClientError,
  );
  const hasAvailabilityBlockingState =
    usernameAvailability.status === "checking" || usernameAvailability.status === "unavailable";
  const isSubmitGuarded = hasClientValidationErrors || hasAvailabilityBlockingState;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setFieldErrors({});
    setSubmitError(null);

    if (isSubmitGuarded) {
      return;
    }

    acceptInviteMutation.mutate();
  }

  if (!Number.isInteger(inviteId) || inviteId <= 0 || !token) {
    return (
      <div className="auth-layout">
        <div className="auth-stack">
          <div className="auth-card">
            <div className="grid gap-2">
              <h2>Invite link is incomplete</h2>
              <p className="muted-text helper-text">
                This onboarding link is missing required invite information.
              </p>
            </div>
            <Link className="button button-primary button-block" href="/login">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (inviteQuery.isLoading) {
    return (
      <div className="auth-layout">
        <div className="auth-stack">
          <div className="auth-card">
            <div className="grid gap-2">
              <h2>Checking invitation</h2>
              <p className="muted-text helper-text">
                Validating your invite link and preparing onboarding.
              </p>
            </div>
            <div className="inline-actions">
              <span aria-hidden="true" className="loading-spinner" />
              <span className="muted-text">Please wait...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (inviteQuery.error) {
    return (
      <div className="auth-layout">
        <div className="auth-stack">
          <div className="auth-card">
            <div className="grid gap-2">
              <h2>Invite is not available</h2>
              <p className="muted-text helper-text">
                This invite may be invalid, expired, revoked, or already accepted.
              </p>
            </div>

            <ErrorAlert error={inviteQuery.error} fallbackMessage="Invite validation failed." />

            <Link className="button button-primary button-block" href="/login">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="auth-layout">
        <div className="auth-stack">
          <div className="auth-card">
            <div className="grid gap-2">
              <h2>Staff onboarding complete</h2>
              <p className="muted-text helper-text">
                @{createdUsername} is now ready. Sign in to continue.
              </p>
            </div>

            <Link className="button button-primary button-block" href="/login">
              Continue to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const invite = inviteQuery.data;
  if (!invite) {
    return (
      <div className="auth-layout">
        <div className="auth-stack">
          <div className="auth-card">
            <div className="grid gap-2">
              <h2>Invite is not available</h2>
              <p className="muted-text helper-text">
                We could not load this invite record. Please request a new invite link from an admin.
              </p>
            </div>
            <Link className="button button-primary button-block" href="/login">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-stack">
        <div className="auth-card">
          <div className="grid gap-2">
            <h2>Complete staff onboarding</h2>
            <p className="muted-text helper-text">
              This invite is for <strong>{invite.email}</strong>. Set your username and password to
              activate staff access.
            </p>
          </div>

          {invite.role_names.length ? (
            <div className="grid gap-2">
              <span className="field-label">Assigned roles</span>
              <div className="tag-list">
                {invite.role_names.map((roleName) => (
                  <span className="tag" key={roleName}>
                    {roleName}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <form className="grid gap-5" onSubmit={handleSubmit}>
            <label
              className={`field ${shouldShowFieldMessage("username") && getFieldError("username") ? "field-invalid" : ""}`}
            >
              <span>Username</span>
              <input
                autoComplete="username"
                onBlur={() => markTouched("username")}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameAvailability({ status: "idle", message: "" });
                  setSubmitError(null);
                  setFieldErrors((current) => ({ ...current, username: undefined }));
                }}
                placeholder="Choose a username"
                required
                value={username}
              />
            </label>
            {shouldShowFieldMessage("username") && getFieldError("username") ? (
              <p className="field-feedback field-feedback-error">{getFieldError("username")}</p>
            ) : null}
            {normalizedUsername && !usernameClientError && usernameAvailability.message ? (
              <p className={`field-feedback ${getAvailabilityFeedbackClass(usernameAvailability.status)}`}>
                {usernameAvailability.message}
              </p>
            ) : null}

            <div className="form-grid form-grid-2">
              <label className="field">
                <span>First name (optional)</span>
                <input
                  autoComplete="given-name"
                  onChange={(event) => setFirstName(event.target.value)}
                  value={firstName}
                />
              </label>
              <label className="field">
                <span>Last name (optional)</span>
                <input
                  autoComplete="family-name"
                  onChange={(event) => setLastName(event.target.value)}
                  value={lastName}
                />
              </label>
            </div>

            <label
              className={`field ${shouldShowFieldMessage("password") && getFieldError("password") ? "field-invalid" : ""}`}
            >
              <span>Password</span>
              <input
                autoComplete="new-password"
                onBlur={() => markTouched("password")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setSubmitError(null);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
                required
                type="password"
                value={password}
              />
            </label>
            {shouldShowFieldMessage("password") && getFieldError("password") ? (
              <p className="field-feedback field-feedback-error">{getFieldError("password")}</p>
            ) : null}
            <ul className="password-requirements">
              {passwordChecks.map((check) => (
                <li
                  className={check.passed ? "password-requirement-met" : "password-requirement-unmet"}
                  key={check.key}
                >
                  {check.label}
                </li>
              ))}
            </ul>

            <label
              className={`field ${shouldShowFieldMessage("confirmPassword") && getFieldError("confirmPassword") ? "field-invalid" : ""}`}
            >
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                onBlur={() => markTouched("confirmPassword")}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setSubmitError(null);
                  setFieldErrors((current) => ({ ...current, confirm_password: undefined }));
                }}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
            {shouldShowFieldMessage("confirmPassword") && getFieldError("confirmPassword") ? (
              <p className="field-feedback field-feedback-error">{getFieldError("confirmPassword")}</p>
            ) : null}

            <button
              className="button button-primary button-block"
              disabled={acceptInviteMutation.isPending || isSubmitGuarded}
              type="submit"
            >
              <ButtonLoadingContent isLoading={acceptInviteMutation.isPending} loadingText="Completing onboarding...">
                Complete onboarding
              </ButtonLoadingContent>
            </button>
          </form>

          <ErrorAlert error={submitError} fallbackMessage="Could not complete onboarding." />

          <p className="m-0 text-sm text-slate-500">
            Already have an account?{" "}
            <Link className="font-semibold text-[#16335f] hover:underline" href="/login">
              Sign in
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
