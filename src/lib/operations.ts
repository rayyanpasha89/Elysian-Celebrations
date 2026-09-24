export const OPERATIONS_PERMISSIONS = [
  "VIEW_EVENT",
  "EDIT_RUN_OF_SHOW",
  "MANAGE_TASKS",
  "MANAGE_INCIDENTS",
  "POST_INTERNAL_UPDATES",
  "MESSAGE_CLIENT",
  "MESSAGE_VENDORS",
  "VIEW_FINANCIALS",
  "MANAGE_STAFF",
  "MANAGE_PRODUCTION",
  "PRINT_EVENT_BOOK",
] as const;

export type OperationsPermission = (typeof OPERATIONS_PERMISSIONS)[number];

export const OPERATIONS_ROLE_TEMPLATES = {
  OPS_LEAD: {
    label: "Operations Lead",
    description: "Owns live delivery, team assignments, escalations, and communication.",
    permissions: OPERATIONS_PERMISSIONS,
  },
  COORDINATOR: {
    label: "Event Coordinator",
    description: "Runs tasks, incidents, updates, and the event-day schedule.",
    permissions: [
      "VIEW_EVENT",
      "EDIT_RUN_OF_SHOW",
      "MANAGE_TASKS",
      "MANAGE_INCIDENTS",
      "POST_INTERNAL_UPDATES",
      "MESSAGE_VENDORS",
      "MANAGE_PRODUCTION",
      "PRINT_EVENT_BOOK",
    ],
  },
  COMMUNICATIONS: {
    label: "Communications",
    description: "Coordinates approved updates with clients, vendors, and the internal team.",
    permissions: [
      "VIEW_EVENT",
      "POST_INTERNAL_UPDATES",
      "MESSAGE_CLIENT",
      "MESSAGE_VENDORS",
      "PRINT_EVENT_BOOK",
    ],
  },
  FINANCE: {
    label: "Finance",
    description: "Reviews published client totals and operational payment status.",
    permissions: ["VIEW_EVENT", "VIEW_FINANCIALS", "PRINT_EVENT_BOOK"],
  },
  VIEWER: {
    label: "Viewer",
    description: "Read-only access to an assigned event and its printable event book.",
    permissions: ["VIEW_EVENT", "PRINT_EVENT_BOOK"],
  },
} as const satisfies Record<
  string,
  {
    label: string;
    description: string;
    permissions: readonly OperationsPermission[];
  }
>;

export type OperationsRoleTemplate = keyof typeof OPERATIONS_ROLE_TEMPLATES;

export const OPERATIONS_ITEM_KINDS = [
  "UPDATE",
  "INCIDENT",
  "DECISION",
  "ESCALATION",
] as const;
export type OperationsItemKind = (typeof OPERATIONS_ITEM_KINDS)[number];

export const OPERATIONS_SEVERITIES = [
  "INFO",
  "WATCH",
  "URGENT",
  "CRITICAL",
] as const;
export type OperationsSeverity = (typeof OPERATIONS_SEVERITIES)[number];

export const OPERATIONS_ITEM_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
] as const;
export type OperationsItemStatus = (typeof OPERATIONS_ITEM_STATUSES)[number];

export const OPERATIONS_SHIFT_STATUSES = [
  "PLANNED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "NO_SHOW",
  "CANCELLED",
] as const;
export type OperationsShiftStatus = (typeof OPERATIONS_SHIFT_STATUSES)[number];

export const OPERATIONS_BRIEFING_PRIORITIES = [
  "NORMAL",
  "HIGH",
  "CRITICAL",
] as const;
export type OperationsBriefingPriority =
  (typeof OPERATIONS_BRIEFING_PRIORITIES)[number];

export function isOperationsPermission(value: unknown): value is OperationsPermission {
  return (
    typeof value === "string" &&
    (OPERATIONS_PERMISSIONS as readonly string[]).includes(value)
  );
}

export function normalizeOperationsPermissions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isOperationsPermission))];
}

export function isOperationsRoleTemplate(
  value: unknown
): value is OperationsRoleTemplate {
  return typeof value === "string" && value in OPERATIONS_ROLE_TEMPLATES;
}

export function templatePermissions(template: OperationsRoleTemplate) {
  return [...OPERATIONS_ROLE_TEMPLATES[template].permissions];
}

export function effectiveOperationsPermissions(
  profilePermissions: readonly string[],
  assignmentPermissions?: readonly string[] | null
) {
  const source = assignmentPermissions ?? profilePermissions;
  return normalizeOperationsPermissions(source);
}
