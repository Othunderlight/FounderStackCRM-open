import {
  AtSign,
  Building2,
  Facebook,
  Gamepad2,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Music2,
  Phone,
  Pin,
  Send,
  Slack,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export type ZernioPlatformMeta = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  /** Platforms that can be connected through the OAuth connect-url flow. */
  connectable: boolean;
};

const PLATFORMS: ZernioPlatformMeta[] = [
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    connectable: true,
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    connectable: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    connectable: true,
  },
  {
    id: "twitter",
    label: "X",
    icon: Twitter,
    color: "text-textPrimary",
    bg: "bg-zinc-500/10",
    connectable: true,
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: Music2,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    connectable: true,
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "text-red-500",
    bg: "bg-red-500/10",
    connectable: true,
  },
  {
    id: "threads",
    label: "Threads",
    icon: AtSign,
    color: "text-textPrimary",
    bg: "bg-zinc-500/10",
    connectable: true,
  },
  {
    id: "pinterest",
    label: "Pinterest",
    icon: Pin,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    connectable: true,
  },
  {
    id: "reddit",
    label: "Reddit",
    icon: MessageCircle,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    connectable: true,
  },
  {
    id: "discord",
    label: "Discord",
    icon: Gamepad2,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    connectable: true,
  },
  {
    id: "slack",
    label: "Slack",
    icon: Slack,
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    connectable: true,
  },
  {
    id: "googlebusiness",
    label: "Google Business",
    icon: Building2,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    connectable: true,
  },
  // Platforms that can appear on person identities or conversations but are
  // connected with credentials or through a different flow.
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
    connectable: false,
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: Send,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    connectable: false,
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    connectable: false,
  },
  {
    id: "sms",
    label: "SMS",
    icon: Phone,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    connectable: false,
  },
];

const PLATFORM_ALIASES: Record<string, string> = {
  x: "twitter",
  "google-business": "googlebusiness",
  google_business: "googlebusiness",
  google_business_profile: "googlebusiness",
  "google-business-profile": "googlebusiness",
};

export const normalizePlatform = (platform?: string | null) => {
  if (!platform) return "";
  const slug = platform.toLowerCase();
  return PLATFORM_ALIASES[slug] || slug;
};

export const getZernioPlatform = (platform?: string | null) => {
  const slug = normalizePlatform(platform);
  return PLATFORMS.find((candidate) => candidate.id === slug);
};

export const getZernioPlatformLabel = (platform?: string | null) =>
  getZernioPlatform(platform)?.label || platform || "Unknown";

export const ZERNIO_CONNECTABLE_PLATFORMS = PLATFORMS.filter(
  (platform) => platform.connectable,
);

export const ZernioPlatformIcon = ({
  platform,
  size = 14,
  className,
}: {
  platform?: string | null;
  size?: number;
  className?: string;
}) => {
  const meta = getZernioPlatform(platform);
  const Icon = meta?.icon || Globe;
  return <Icon size={size} className={className || meta?.color} />;
};
