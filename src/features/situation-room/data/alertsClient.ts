import type { Alert, AlertFormData } from "../domain/types";

const ALERTS_STORAGE_KEY = "situation-room-alerts";

const DEFAULT_ALERTS: Alert[] = [
  {
    id: "alert-1",
    name: "Red Sea Shipping Watch",
    countries: ["Yemen", "Saudi Arabia", "Egypt"],
    categories: ["conflict", "diplomacy"],
    threat_levels: ["high", "critical"],
    keywords: ["shipping", "drone", "strait"],
    is_active: true,
    email_notifications: false,
  },
  {
    id: "alert-2",
    name: "Korean Peninsula Escalation",
    countries: ["North Korea", "South Korea", "Japan"],
    categories: ["nuclear", "conflict"],
    threat_levels: ["moderate", "high", "critical"],
    keywords: ["missile", "launch", "exercise"],
    is_active: true,
    email_notifications: true,
  },
];

const isBrowser = () => typeof window !== "undefined";

const loadAlerts = (): Alert[] => {
  if (!isBrowser()) return DEFAULT_ALERTS;
  const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY);
  if (!raw) return DEFAULT_ALERTS;
  try {
    const parsed = JSON.parse(raw) as Alert[];
    return Array.isArray(parsed) ? parsed : DEFAULT_ALERTS;
  } catch {
    return DEFAULT_ALERTS;
  }
};

const persistAlerts = (alerts: Alert[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
};

const buildId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `alert-${Date.now()}`;
};

export const alertsClient = {
  async list(): Promise<Alert[]> {
    return loadAlerts();
  },
  async create(data: AlertFormData): Promise<Alert> {
    const alert: Alert = { id: buildId(), ...data };
    const next = [alert, ...loadAlerts()];
    persistAlerts(next);
    return alert;
  },
  async update(id: string, data: Partial<AlertFormData>): Promise<Alert> {
    const alerts = loadAlerts();
    const index = alerts.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("Alert not found");
    }
    const updated = { ...alerts[index], ...data };
    const next = [...alerts];
    next[index] = updated;
    persistAlerts(next);
    return updated;
  },
  async delete(id: string): Promise<void> {
    const next = loadAlerts().filter((item) => item.id !== id);
    persistAlerts(next);
  },
};
