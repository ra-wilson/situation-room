import type { User } from "../domain/types";

const AUTH_STORAGE_KEY = "situation-room-auth";
const LOGGED_OUT_SENTINEL = "logged_out";

const DEFAULT_USER: User = {
  id: "operator-1",
  full_name: "Operator",
  email: "operator@situation.local",
  role: "analyst",
};

const isBrowser = () => typeof window !== "undefined";

const loadUser = (): User | null => {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  if (raw === LOGGED_OUT_SENTINEL) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

const persistUser = (user: User | null) => {
  if (!isBrowser()) return;
  if (!user) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, LOGGED_OUT_SENTINEL);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

export const authClient = {
  async isAuthenticated(): Promise<boolean> {
    return Boolean(loadUser());
  },
  async getCurrentUser(): Promise<User | null> {
    return loadUser();
  },
  async login(): Promise<User> {
    const user = DEFAULT_USER;
    persistUser(user);
    return user;
  },
  async logout(): Promise<void> {
    persistUser(null);
  },
};
