import { cn } from "../../lib/utils";
import type { PersonIdentity } from "../../types";
import { getZernioPlatform, getZernioPlatformLabel } from "./platforms";

const formatIdentityLabel = (identity: PersonIdentity) => {
  if (identity.username && !/^\d+$/.test(identity.username)) {
    return `@${identity.username}`;
  }
  return identity.displayName || identity.username || identity.externalId;
};

const formatLastSeen = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const PersonIdentities = ({
  identities,
  max = 4,
  compact = false,
  className,
}: {
  identities?: PersonIdentity[];
  max?: number;
  compact?: boolean;
  className?: string;
}) => {
  if (!identities || identities.length === 0) return null;

  const visible = identities.slice(0, max);
  const hiddenCount = identities.length - visible.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((identity) => {
        const meta = getZernioPlatform(identity.platform);
        const Icon = meta?.icon;
        const label = formatIdentityLabel(identity);
        const lastSeen = formatLastSeen(identity.lastSeenAt);
        const title = `${getZernioPlatformLabel(identity.platform)}${
          lastSeen ? ` · last seen ${lastSeen}` : ""
        }`;

        return (
          <span
            key={identity.id}
            title={title}
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-card-hover/40 text-textSecondary",
              compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full",
                compact ? "h-4 w-4" : "h-5 w-5",
                meta?.bg || "bg-border/20",
              )}
            >
              {Icon ? (
                <Icon
                  size={compact ? 10 : 11}
                  className={meta?.color || "text-textSecondary"}
                />
              ) : null}
            </span>
            <span className="truncate font-medium text-textPrimary">{label}</span>
            <span className="shrink-0 text-[9px] uppercase tracking-wide opacity-70">
              {meta?.label || identity.platform}
            </span>
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <span className="text-[10px] text-textSecondary opacity-70">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};
