export function formatMemberName(member: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
}) {
  return [member.first_name, member.middle_name, member.last_name].filter(Boolean).join(" ");
}
