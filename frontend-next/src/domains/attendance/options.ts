export const SERVICE_EVENT_TYPE_OPTIONS = [
  { value: "SUNDAY_SERVICE", label: "Sunday Service" },
  { value: "MIDWEEK_SERVICE", label: "Midweek Service" },
  { value: "PRAYER_MEETING", label: "Prayer Meeting" },
  { value: "YOUTH_MEETING", label: "Youth Meeting" },
  { value: "CHOIR_REHEARSAL", label: "Choir Rehearsal" },
  { value: "SPECIAL_EVENT", label: "Special Event" },
  { value: "OTHER", label: "Other" },
] as const;

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "EXCUSED", label: "Excused" },
] as const;

export function getServiceEventTypeLabel(value: string) {
  return SERVICE_EVENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getAttendanceStatusLabel(value: string) {
  return ATTENDANCE_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
