export const alertSchema = {
  name: "Alert",
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Name of the alert",
    },
    countries: {
      type: "array",
      items: {
        type: "string",
      },
      description: "Countries to monitor",
    },
    categories: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Event categories to monitor (conflict, diplomacy, economy, nuclear, cyber, political)",
    },
    threat_levels: {
      type: "array",
      items: {
        type: "string",
      },
      description: "Minimum threat levels to trigger (critical, high, moderate, low)",
    },
    keywords: {
      type: "array",
      items: {
        type: "string",
      },
      description: "Keywords to watch for",
    },
    is_active: {
      type: "boolean",
      default: true,
      description: "Whether the alert is active",
    },
    email_notifications: {
      type: "boolean",
      default: false,
      description: "Send email notifications",
    },
  },
  required: ["name"],
} as const;
