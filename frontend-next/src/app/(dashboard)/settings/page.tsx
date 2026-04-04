"use client";

import Link from "next/link";

import { useSession } from "@/auth/use-session";
import { PageHeader, StatusBadge } from "@/components";

function hasSettingsAdminAccess(roleNames: string[], isSuperuser: boolean): boolean {
  if (isSuperuser) {
    return true;
  }

  return roleNames.some((roleName) => roleName === "Super Admin" || roleName === "Church Admin");
}

interface SettingsLinkCard {
  description: string;
  href: string;
  title: string;
}

const personalSettingsLinks: SettingsLinkCard[] = [
  {
    title: "Profile",
    description: "View and update personal details like your name and profile information.",
    href: "/settings/profile",
  },
  {
    title: "Manage account",
    description: "Update account email and password preferences.",
    href: "/settings/account",
  },
  {
    title: "Help & support",
    description: "Get quick support guidance and account assistance options.",
    href: "/settings/support",
  },
];

const adminSettingsLinks: SettingsLinkCard[] = [
  {
    title: "Staff users",
    description:
      "Manage active staff, elevate basic users, and administer invite/onboarding lifecycle states.",
    href: "/settings/staff",
  },
  {
    title: "Roles",
    description: "Review seeded role definitions, assigned users, and permission coverage.",
    href: "/settings/roles",
  },
];

export default function SettingsLandingPage() {
  const { user } = useSession();
  const roleNames = user?.role_names ?? [];
  const isSettingsAdmin = hasSettingsAdminAccess(roleNames, Boolean(user?.is_superuser));

  return (
    <div className="page-stack">
      <PageHeader
        description="Use settings to manage your account, profile details, support options, and admin lifecycle workflows."
        eyebrow="Settings"
        meta={
          <>
            <StatusBadge label="Account preferences" tone="info" />
            {isSettingsAdmin ? <StatusBadge label="Staff lifecycle controls" tone="success" /> : null}
          </>
        }
        title="Settings"
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Personal settings</h3>
            <p className="muted-text">Profile and account controls available to every signed-in user.</p>
          </div>
        </div>

        <div className="panel-grid">
          {personalSettingsLinks.map((linkCard) => (
            <article className="panel" key={linkCard.href}>
              <div className="panel-header">
                <div>
                  <h3>{linkCard.title}</h3>
                  <p className="muted-text">{linkCard.description}</p>
                </div>
              </div>
              <div className="inline-actions">
                <Link className="button button-secondary" href={linkCard.href}>
                  Open {linkCard.title}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {isSettingsAdmin ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Admin settings</h3>
              <p className="muted-text">
                Admin-only tools for staff lifecycle, role governance visibility, and invite operations.
              </p>
            </div>
          </div>

          <div className="panel-grid">
            {adminSettingsLinks.map((linkCard) => (
              <article className="panel" key={linkCard.href}>
                <div className="panel-header">
                  <div>
                    <h3>{linkCard.title}</h3>
                    <p className="muted-text">{linkCard.description}</p>
                  </div>
                </div>
                <div className="inline-actions">
                  <Link className="button button-primary" href={linkCard.href}>
                    Open {linkCard.title}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
