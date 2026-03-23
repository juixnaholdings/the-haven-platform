import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ErrorAlert } from "../components/ErrorAlert";
import { LoadingScreen } from "../components/LoadingScreen";
import { membersApi } from "../domains/members/api";

export function MembersPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const membersQuery = useQuery({
    queryKey: ["members", { search: deferredSearch }],
    queryFn: () =>
      membersApi.listMembers({
        search: deferredSearch || undefined,
      }),
  });

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="app-eyebrow">Representative CRUD surface</p>
          <h2>Members</h2>
        </div>
        <p className="muted-text">
          This page proves a protected domain list flow using the shared API client and members
          module.
        </p>
      </section>

      <section className="panel">
        <label className="field">
          <span>Search members</span>
          <input
            placeholder="Search by name, email, or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </section>

      {membersQuery.isLoading ? <LoadingScreen label="Loading members..." /> : null}
      {membersQuery.error ? (
        <ErrorAlert error={membersQuery.error} fallbackMessage="Unable to load members." />
      ) : null}

      {!membersQuery.isLoading && !membersQuery.error ? (
        <section className="panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {membersQuery.data && membersQuery.data.length > 0 ? (
                  membersQuery.data.map((member) => (
                    <tr key={member.id}>
                      <td>{member.full_name}</td>
                      <td>{member.email || "—"}</td>
                      <td>{member.phone_number || "—"}</td>
                      <td>{member.is_active ? "Active" : "Inactive"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-cell" colSpan={4}>
                      No members matched the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
