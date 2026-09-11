const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  EDITOR: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  VIEWER: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

export function RoleBadge({ role }: { role: "OWNER" | "EDITOR" | "VIEWER" }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
