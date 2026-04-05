"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ButtonLoadingContent } from "@/components";
import { ErrorAlert } from "@/components/ErrorAlert";
import { formatApiErrors, isApiError } from "@/api/errors";
import { authApi } from "@/domains/auth/api";

type SignupFieldName = "username" | "email" | "password" | "confirmPassword";
type SignupApiFieldName = "username" | "email" | "password" | "confirm_password";
type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable" | "error";

interface AvailabilityState {
  status: AvailabilityStatus;
  message: string;
}

type SignupFieldErrors = Partial<Record<SignupApiFieldName, string[]>>;

const USERNAME_PATTERN = /^[\w.@+-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_FIELD_KEYS: SignupApiFieldName[] = [
  "username",
  "email",
  "password",
  "confirm_password",
];

function normalizeFieldMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (value == null) {
    return [];
  }

  return [String(value)];
}

function extractSignupFieldErrors(error: unknown): SignupFieldErrors {
  if (!isApiError(error) || !error.errors || typeof error.errors !== "object") {
    return {};
  }

  const collected: SignupFieldErrors = {};
  SIGNUP_FIELD_KEYS.forEach((fieldName) => {
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

function hasNonFieldSignupErrors(error: unknown): boolean {
  if (!isApiError(error) || !error.errors || typeof error.errors !== "object") {
    return true;
  }

  const keys = Object.keys(error.errors);
  if (!keys.length) {
    return true;
  }

  return keys.some((key) => !SIGNUP_FIELD_KEYS.includes(key as SignupApiFieldName));
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

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Record<SignupFieldName, boolean>>({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [usernameAvailability, setUsernameAvailability] = useState<AvailabilityState>({
    status: "idle",
    message: "",
  });
  const [emailAvailability, setEmailAvailability] = useState<AvailabilityState>({
    status: "idle",
    message: "",
  });
  const [createdUsername, setCreatedUsername] = useState("");
  const [isSignupComplete, setIsSignupComplete] = useState(false);

  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim();

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

  const emailClientError = useMemo(() => {
    if (!normalizedEmail) {
      return "Email is required.";
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return "Enter a valid email address.";
    }

    return undefined;
  }, [normalizedEmail]);

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

  useEffect(() => {
    if (!normalizedEmail || emailClientError) {
      return;
    }

    let isCancelled = false;
    const timerId = window.setTimeout(async () => {
      setEmailAvailability({
        status: "checking",
        message: "Checking email availability...",
      });

      try {
        const response = await authApi.checkEmailAvailability(normalizedEmail);
        if (isCancelled) {
          return;
        }

        setEmailAvailability(
          response.available
            ? { status: "available", message: "Email is available." }
            : { status: "unavailable", message: "Email is already in use." },
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const details = formatApiErrors(error);
        setEmailAvailability({
          status: "error",
          message: details[0] ?? "Could not validate email availability right now.",
        });
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timerId);
    };
  }, [normalizedEmail, emailClientError]);

  function markTouched(field: SignupFieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function shouldShowFieldMessage(field: SignupFieldName): boolean {
    return touched[field] || hasSubmitted;
  }

  function getFieldError(field: SignupFieldName): string | undefined {
    if (field === "username") {
      return usernameClientError ?? fieldErrors.username?.[0];
    }
    if (field === "email") {
      return emailClientError ?? fieldErrors.email?.[0];
    }
    if (field === "password") {
      return passwordClientError ?? fieldErrors.password?.[0];
    }

    return confirmPasswordClientError ?? fieldErrors.confirm_password?.[0];
  }

  const hasClientValidationErrors = Boolean(
    usernameClientError ||
      emailClientError ||
      passwordClientError ||
      confirmPasswordClientError,
  );
  const hasAvailabilityBlockingState =
    usernameAvailability.status === "checking" ||
    usernameAvailability.status === "unavailable" ||
    emailAvailability.status === "checking" ||
    emailAvailability.status === "unavailable";
  const isSubmitGuarded = hasClientValidationErrors || hasAvailabilityBlockingState;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setSubmitError(null);
    setFieldErrors({});

    if (isSubmitGuarded) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.signup({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        confirm_password: confirmPassword,
      });

      setCreatedUsername(response.user.username);
      setIsSignupComplete(true);
      setIsSubmitting(false);
    } catch (error) {
      const signupFieldErrors = extractSignupFieldErrors(error);
      setFieldErrors(signupFieldErrors);
      setSubmitError(hasNonFieldSignupErrors(error) ? error : null);
      setIsSubmitting(false);
    }
  }

  if (isSignupComplete) {
    return (
      <div className="auth-layout">
        <div className="auth-stack">
          <div className="auth-card">
            <div className="grid gap-2">
              <h2>Account created</h2>
              <p className="muted-text helper-text">
                @{createdUsername} was created as a basic user. Sign in to continue.
              </p>
            </div>

            <Link
              className="button button-primary button-block"
              href="/login"
            >
              Continue to sign in
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
            <h2>Create your account</h2>
            <p className="muted-text helper-text">
              New accounts start with basic access and no assigned roles.
            </p>
          </div>

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
              <p
                className={`field-feedback ${getAvailabilityFeedbackClass(usernameAvailability.status)}`}
              >
                {usernameAvailability.message}
              </p>
            ) : null}

            <label
              className={`field ${shouldShowFieldMessage("email") && getFieldError("email") ? "field-invalid" : ""}`}
            >
              <span>Email</span>
              <input
                autoComplete="email"
                onBlur={() => markTouched("email")}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailAvailability({ status: "idle", message: "" });
                  setSubmitError(null);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            {shouldShowFieldMessage("email") && getFieldError("email") ? (
              <p className="field-feedback field-feedback-error">{getFieldError("email")}</p>
            ) : null}
            {normalizedEmail && !emailClientError && emailAvailability.message ? (
              <p className={`field-feedback ${getAvailabilityFeedbackClass(emailAvailability.status)}`}>
                {emailAvailability.message}
              </p>
            ) : null}

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

            <button className="button button-primary button-block" disabled={isSubmitting || isSubmitGuarded} type="submit">
              <ButtonLoadingContent isLoading={isSubmitting} loadingText="Creating account...">
                Create account
              </ButtonLoadingContent>
            </button>
          </form>

          <ErrorAlert error={submitError} fallbackMessage="Sign-up failed. Please try again." />

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
