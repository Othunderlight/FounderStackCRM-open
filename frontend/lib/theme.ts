import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const homeTheme = {
  card: "bg-home-card",
  mockup: "bg-home-mockup",
  border: {
    subtle: "border-home-border-subtle",
    hover: "hover:border-home-border-hover",
    medium: "border-home-border-medium",
  },
  bg: {
    verySubtle: "bg-home-bg-very-subtle",
    subtle: "bg-home-bg-subtle",
    medium: "bg-home-bg-medium",
  },
  text: "text-home-text",
};

export const importTheme = {
  bg: "bg-import-bg",
  surface: "bg-import-surface",
  input: "bg-import-input",
  card: "bg-import-card",
  hover: "hover:bg-import-hover",
};

export const settingsTheme = {
  bg: "bg-settings-bg",
  card: "bg-settings-card",
  dialog: "bg-settings-dialog",
  surface: "bg-settings-surface",
  hover: "bg-settings-hover",
  input: "bg-settings-input",
  inputAlt: "bg-settings-input-alt",
  dark: "bg-settings-dark",
  borderAlt: "border-settings-border-alt",
  switchOff: "bg-settings-switch-off",
  btnHover: "bg-settings-btn-hover",
  navHover: "bg-settings-nav-hover",
  navActive: "bg-settings-nav-active",
  navActiveText: "text-settings-nav-active-text",
  badge: "bg-settings-badge",
  // Extended properties for comprehensive theming
  secondaryBg: "bg-settings-secondary-bg",
  tertiaryBg: "bg-settings-tertiary-bg",
  quaternaryBg: "bg-settings-quaternary-bg",
  hoverAlt: "bg-settings-hover-alt",
  text: {
    primary: "text-settings-text-primary",
    secondary: "text-settings-text-secondary",
    muted: "text-settings-text-muted",
    accent: "text-settings-text-accent",
    error: "text-settings-text-error",
    success: "text-settings-text-success",
  },
  border: {
    primary: "border-settings-border-primary",
    secondary: "border-settings-border-secondary",
  },
  button: {
    primary: "bg-settings-button-primary hover:bg-settings-button-hover",
    secondary: "bg-settings-button-secondary hover:bg-settings-button-secondary-hover",
    ghost: "hover:bg-settings-hover",
    outline: "border-settings-border-primary hover:bg-settings-hover",
  },
  gradient: {
    primary: "from-settings-gradient-primary-from to-settings-gradient-primary-to",
    secondary: "from-settings-gradient-secondary-from to-settings-gradient-secondary-to",
  },
  icon: {
    blue: "text-settings-icon-blue",
    purple: "text-settings-icon-purple",
    green: "text-settings-icon-green",
    red: "text-settings-icon-red",
  },
  status: {
    active: "bg-settings-status-active",
    pending: "bg-settings-status-pending",
  },
  accountIcon: "text-settings-account-icon",
  apiPlayground: "bg-settings-api-playground",
};

export const inviteLandingTheme = {
  leftBg: "bg-invite-left-bg",
  rightBg: "bg-invite-right-bg",
  card: "bg-invite-card",
  logoGradient: {
    from: "text-invite-logo-gradient-from",
    via: "via-invite-logo-gradient-via",
    to: "to-invite-logo-gradient-to",
  },
  textGradient: {
    from: "from-invite-text-gradient-from",
    to: "to-invite-text-gradient-to",
  },
  error: "text-invite-error",
  blur: {
    blue: "bg-invite-blur-blue",
    purple: "bg-invite-blur-purple",
  },
  inviter: "text-invite-inviter",
  check: {
    green: "text-invite-check-green",
    blue: "text-invite-check-blue",
    purple: "text-invite-check-purple",
  },
};

export const inviteDialogTheme = {
  bg: "bg-invite-dialog-bg",
  card: "bg-invite-card-bg",
  hover: "bg-invite-hover",
  border: "border-invite-border",
  text: {
    primary: "text-invite-text-primary",
    secondary: "text-invite-text-secondary",
  },
  blue: {
    bg: "bg-invite-blue-bg",
    text: "text-invite-blue-text",
    hoverText: "group-hover:text-invite-blue-hover-text",
    hoverBg: "group-hover:bg-invite-blue-hover-bg",
    shadow: "shadow-invite-blue-shadow",
  },
  purple: {
    bg: "bg-invite-purple-bg",
    text: "text-invite-purple-text",
    hoverText: "group-hover:text-invite-purple-hover-text",
    hoverBg: "group-hover:bg-invite-purple-hover-bg",
    shadow: "shadow-invite-purple-shadow",
  },
  gradient: {
    blue: "from-invite-gradient-blue-from",
    purple: "from-invite-gradient-purple-from",
  },
  green: {
    text: "text-invite-green-text",
    bg: "bg-invite-green-bg",
    hover: "hover:bg-invite-green-hover",
  },
  button: {
    blue: "bg-invite-blue-primary hover:bg-invite-blue-hover",
  },
  loading: {
    blur: "bg-invite-blue-blur",
  },
  info: {
    team: {
      border: "border-invite-team-border",
      text: "text-invite-team-text",
    },
    external: {
      border: "border-invite-external-border",
      text: "text-invite-external-text",
    },
  },
};

export const authTheme = {
  bg: {
    primary: "bg-auth-bg-primary",
    input: "bg-auth-bg-input",
  },
  text: {
    primary: "text-auth-text-primary",
    secondary: "text-auth-text-secondary",
    muted: "text-auth-text-muted",
    error: "text-auth-text-error",
  },
  border: {
    primary: "border-auth-border-primary",
    secondary: "border-auth-border-secondary",
    focus: "focus:border-auth-border-focus",
    error: "border-auth-border-error",
    errorFocus: "focus-visible:ring-auth-border-error",
  },
  input: {
    bg: "bg-auth-input-bg",
    border: "border-auth-input-border",
    focus: "focus:border-auth-input-focus",
    error: "border-auth-input-error",
    errorFocus: "focus-visible:ring-auth-input-error",
  },
  button: {
    primary: "bg-auth-button-primary hover:bg-auth-button-primary-hover",
    google: "bg-auth-button-google hover:bg-auth-button-google-hover",
  },
  error: {
    bg: "bg-auth-error-bg",
    border: "border-auth-error-border",
    text: "text-auth-error-text",
  },
  logoGradient: {
    from: "text-auth-logo-gradient-from",
    via: "via-auth-logo-gradient-via",
    to: "to-auth-logo-gradient-to",
  },
};

export const onboardingPageTheme = {
  bg: {
    primary: "bg-onboarding-bg-primary",
    secondary: "bg-onboarding-bg-secondary",
    input: "bg-onboarding-bg-input",
  },
  text: {
    primary: "text-onboarding-text-primary",
    secondary: "text-onboarding-text-secondary",
    muted: "text-onboarding-text-muted",
    footer: "text-onboarding-text-footer",
    error: "text-onboarding-text-error",
  },
  border: {
    primary: "border-onboarding-border-primary",
    secondary: "border-onboarding-border-secondary",
  },
  focus: {
    ring: "focus:ring-onboarding-focus-ring",
  },
  button: {
    primary: "bg-onboarding-button-primary hover:bg-onboarding-button-hover",
  },
  progress: "bg-onboarding-progress",
  logoGradient: {
    from: "text-onboarding-logo-gradient-from",
    via: "via-onboarding-logo-gradient-via",
    to: "to-onboarding-logo-gradient-to",
  },
  card: "bg-onboarding-card-bg",
  referral: {
    inactive: "text-onboarding-referral-inactive",
    active: {
      bg: "bg-onboarding-referral-active-bg",
      border: "border-onboarding-referral-active-border",
    },
  },
};

export const onboardingModalTheme = {
  bg: "bg-onboarding-modal-bg",
  card: "bg-onboarding-modal-card",
  footer: "bg-onboarding-modal-footer",
  progress: "bg-onboarding-modal-progress",
  blue: {
    bg: "bg-onboarding-modal-blue-bg",
    text: "text-onboarding-modal-blue-text",
  },
  purple: {
    bg: "bg-onboarding-modal-purple-bg",
    text: "text-onboarding-modal-purple-text",
  },
  orange: {
    bg: "bg-onboarding-modal-orange-bg",
    text: "text-onboarding-modal-orange-text",
  },
  input: {
    bg: "bg-onboarding-modal-input-bg",
    focus: "focus:ring-onboarding-modal-input-focus",
  },
  button: {
    primary: "bg-onboarding-modal-button-primary hover:bg-onboarding-modal-button-hover",
  },
  tag: {
    active: "bg-onboarding-modal-tag-active",
    hover: "hover:border-onboarding-modal-tag-hover",
  },
  tip: {
    bg: "bg-onboarding-modal-tip-bg",
    border: "border-onboarding-modal-tip-border",
    text: "text-onboarding-modal-tip-text",
  },
};

export const proModalTheme = {
  bg: "bg-pro-modal-bg",
  text: {
    primary: "text-pro-modal-text-primary",
    secondary: "text-pro-modal-text-secondary",
  },
  icon: {
    bg: "bg-pro-modal-icon-bg",
    border: "border-pro-modal-icon-border",
  },
  button: {
    primary: "bg-pro-modal-button-primary hover:bg-pro-modal-button-hover",
  },
};

export const modalTheme = {
  connectTelegram: {
    bg: "bg-modal-connect-telegram-bg",
    border: "border-modal-connect-telegram-border",
    title: "text-modal-connect-telegram-title",
    description: "text-modal-connect-telegram-description",
    link: {
      bg: "bg-modal-connect-telegram-link-bg",
      border: "border-modal-connect-telegram-link-border",
      hoverBorder: "hover:border-modal-connect-telegram-link-hover-border",
      hoverShadow: "hover:shadow-modal-connect-telegram-link-hover-shadow",
      iconBg: "bg-modal-connect-telegram-link-icon-bg",
      icon: "text-modal-connect-telegram-link-icon",
      text: "text-modal-connect-telegram-link-text",
      arrow: "text-modal-connect-telegram-link-arrow",
    },
    input: {
      bg: "bg-modal-connect-telegram-input-bg",
      border: "border-modal-connect-telegram-input-border",
    },
    button: {
      primary: "bg-modal-connect-telegram-button-primary hover:bg-modal-connect-telegram-button-primary-hover",
      ghost: "hover:bg-modal-connect-telegram-button-ghost-hover",
    },
  },
  success: {
    bg: "bg-modal-success-bg",
    border: "border-modal-success-border",
    title: "text-modal-success-title",
    description: "text-modal-success-description",
    icon: "text-modal-success-icon",
    card: {
      bg: "bg-modal-success-card-bg",
      border: "border-modal-success-card-border",
      icon: "text-modal-success-card-icon",
      text: "text-modal-success-card-text",
    },
    button: {
      primary: "bg-modal-success-button-primary hover:bg-modal-success-button-primary-hover",
      ghost: "hover:bg-modal-success-button-ghost-hover",
    },
  },
  error: {
    bg: "bg-modal-error-bg",
    border: "border-modal-error-border",
    title: "text-modal-error-title",
    description: "text-modal-error-description",
    icon: "text-modal-error-icon",
    card: {
      bg: "bg-modal-error-card-bg",
      border: "border-modal-error-card-border",
      icon: "text-modal-error-card-icon",
      text: "text-modal-error-card-text",
    },
    button: {
      primary: "bg-modal-error-button-primary hover:bg-modal-error-button-primary-hover",
      ghost: "hover:bg-modal-error-button-ghost-hover",
    },
  },
};

export const toastTheme = {
  success: {
    bg: "bg-toast-success-bg",
    border: "border-toast-success-border",
    iconBg: "bg-toast-success-icon-bg",
    icon: "text-toast-success-icon",
    text: "text-toast-success-text",
  },
  error: {
    bg: "bg-toast-error-bg",
    border: "border-toast-error-border",
    iconBg: "bg-toast-error-icon-bg",
    icon: "text-toast-error-icon",
    text: "text-toast-error-text",
  },
  info: {
    bg: "bg-toast-info-bg",
    border: "border-toast-info-border",
    iconBg: "bg-toast-info-icon-bg",
    icon: "text-toast-info-icon",
    text: "text-toast-info-text",
  },
  warning: {
    bg: "bg-toast-warning-bg",
    border: "border-toast-warning-border",
    iconBg: "bg-toast-warning-icon-bg",
    icon: "text-toast-warning-icon",
    text: "text-toast-warning-text",
  },
};

export const bannerTheme = {
  telegram: {
    bg: "bg-banner-telegram-bg",
    border: "border-banner-telegram-border",
    iconBg: "bg-banner-telegram-icon-bg",
    iconText: "text-banner-telegram-icon",
    text: "text-banner-telegram-text",
    button: {
      bg: "bg-banner-telegram-button hover:bg-banner-telegram-button-hover",
      text: "text-banner-telegram-button-text",
    },
  },
  verification: {
    bg: "bg-banner-verification-bg",
    border: "border-banner-verification-border",
    iconBg: "bg-banner-verification-icon-bg",
    iconText: "text-banner-verification-icon",
    text: "text-banner-verification-text",
    button: {
      idle: "bg-banner-verification-button-idle hover:bg-banner-verification-button-idle-hover",
      sent: "bg-banner-verification-button-sent text-banner-verification-button-sent-text",
      error: "bg-banner-verification-button-error text-banner-verification-button-error-text",
      disabled: "bg-banner-verification-button-disabled text-banner-verification-button-disabled-text",
    },
  },
  verificationSuccess: {
    bg: "bg-banner-verification-success-bg",
    blur: "bg-banner-verification-success-blur",
    card: "bg-banner-verification-success-card",
    border: "border-banner-verification-success-border",
    icon: "text-banner-verification-success-icon",
    sparkle: "text-banner-verification-success-sparkle",
    text: {
      primary: "text-banner-verification-success-text-primary",
      secondary: "text-banner-verification-success-text-secondary",
    },
    button: "bg-banner-verification-success-button hover:bg-banner-verification-success-button-hover",
  },
  modal: {
    bg: "bg-banner-modal-bg",
    border: "border-banner-modal-border",
    iconBg: "bg-banner-modal-icon-bg",
    iconBorder: "border-banner-modal-icon-border",
    icon: "text-banner-modal-icon",
    title: "text-banner-modal-title",
    description: "text-banner-modal-description",
    button: {
      primary: "bg-banner-modal-button-primary hover:bg-banner-modal-button-primary-hover",
      sent: "bg-banner-modal-button-sent hover:bg-banner-modal-button-sent-hover",
      error: "bg-banner-modal-button-error hover:bg-banner-modal-button-error-hover",
      ghost: "bg-banner-modal-button-ghost hover:bg-banner-modal-button-ghost-hover",
    },
    text: {
      small: "text-banner-modal-text-small",
    },
  },
};
