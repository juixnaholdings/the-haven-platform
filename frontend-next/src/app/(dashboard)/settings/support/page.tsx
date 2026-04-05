"use client";

import Link from "next/link";

import { hasSettingsAdminAccess } from "@/auth/access";
import { useSession } from "@/auth/use-session";
import { PageHeader, StatusBadge } from "@/components";

interface SupportLinkCard {
  description: string;
  href: string;
  title: string;
}

const personalQuickActions: SupportLinkCard[] = [
  {
    title: "Update profile details",
    description: "Edit your personal profile information and contact details.",
    href: "/settings/profile",
  },
  {
    title: "Manage account credentials",
    description: "Update account email and password preferences.",
    href: "/settings/account",
  },
];

const adminQuickAction: SupportLinkCard = {
  title: "Review role assignments",
  description: "Check role coverage and access expectations.",
  href: "/settings/roles",
};

export default function SettingsSupportPage() {
  const { user } = useSession();
  const isSettingsAdmin = hasSettingsAdminAccess(user);
  const quickActions = isSettingsAdmin
    ? [...personalQuickActions, adminQuickAction]
    : personalQuickActions;

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" href="/settings/account">
              Manage account
            </Link>
            <a className="button button-primary" href="mailto:support@thehaven.local">
              Contact support
            </a>
          </div>
        }
        description="Find quick guidance, account help routes, and the right support contact path."
        eyebrow="Settings / support"
        meta={
          <>
            <StatusBadge label="Self-service guidance" tone="info" />
            <StatusBadge label="Email support" tone="success" />
          </>
        }
        title="Help & Support"
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Quick help actions</h3>
            <p className="muted-text">Start with these common support destinations.</p>
          </div>
        </div>

        <div className="panel-grid">
          {quickActions.map((quickAction) => (
            <article className="panel" key={quickAction.href}>
              <div className="panel-header">
                <div>
                  <h3>{quickAction.title}</h3>
                  <p className="muted-text">{quickAction.description}</p>
                </div>
              </div>
              <div className="inline-actions">
                <Link className="button button-secondary" href={quickAction.href}>
                  Open
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Support expectations</h3>
            <p className="muted-text">Use this flow to get faster help without routing delays.</p>
          </div>
        </div>

        <ul className="item-list">
          <li className="item-row">
            <div>
              <strong>Account access issues</strong>
              <span>Start with Manage account to confirm email and password updates.</span>
            </div>
          </li>
          <li className="item-row">
            <div>
              <strong>Profile data updates</strong>
              <span>Use Profile settings for name, contact, and personal detail corrections.</span>
            </div>
          </li>
          {isSettingsAdmin ? (
            <li className="item-row">
              <div>
                <strong>Permission or role questions</strong>
                <span>Use Roles to verify expected access, then contact support if escalation is needed.</span>
              </div>
            </li>
          ) : (
            <li className="item-row">
              <div>
                <strong>Permission or role questions</strong>
                <span>Contact your administrator for role-related access requests and escalation support.</span>
              </div>
            </li>
          )}
          <li className="item-row">
            <div>
              <strong>Need direct support</strong>
              <span>Email <a className="auth-switch-link" href="mailto:support@thehaven.local">support@thehaven.local</a> with screenshots and error context.</span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
