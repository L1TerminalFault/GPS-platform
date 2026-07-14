import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

const CACHE_TTL_MS = 60_000;

type UserInfo = { name: string; imageUrl: string };

interface AppStore {
  usersMap: Record<string, UserInfo>;
  setUsers: (users: Record<string, UserInfo>) => void;
  resolveUsers: (ids: string[]) => Promise<Record<string, UserInfo>>;

  rentals: any[];
  rentalsFetchedAt: number | null;
  setRentals: (rentals: any[]) => void;
  upsertRental: (rental: any) => void;
  removeRental: (id: string) => void;
  ensureRentals: (opts?: { force?: boolean }) => Promise<any[]>;

  orders: any[];
  ordersFetchedAt: number | null;
  setOrders: (orders: any[]) => void;
  upsertOrder: (order: any) => void;
  ensureOrders: (opts?: { force?: boolean }) => Promise<any[]>;

  gpsRegistry: any[];
  gpsFetchedAt: number | null;
  setGpsRegistry: (gpsRegistry: any[]) => void;
  ensureGpsRegistry: (opts?: { force?: boolean }) => Promise<any[]>;
}

function isFresh(fetchedAt: number | null) {
  return fetchedAt != null && Date.now() - fetchedAt < CACHE_TTL_MS;
}

export const useAppStore = create<AppStore>((set, get) => ({
  usersMap: {},
  setUsers: (users) => set((state) => ({ usersMap: { ...state.usersMap, ...users } })),
  resolveUsers: async (ids) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return get().usersMap;

    const missing = unique.filter((id) => !get().usersMap[id]);
    if (!missing.length) return get().usersMap;

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: missing }),
      });
      const names = await res.json();
      if (names && typeof names === "object" && !names.error) {
        set((state) => ({ usersMap: { ...state.usersMap, ...names } }));
      }
    } catch {
      /* ignore user resolve failures */
    }
    return get().usersMap;
  },

  rentals: [],
  rentalsFetchedAt: null,
  setRentals: (rentals) => set({ rentals, rentalsFetchedAt: Date.now() }),
  upsertRental: (rental) =>
    set((state) => {
      const idx = state.rentals.findIndex((r) => r._id === rental._id);
      if (idx === -1) return { rentals: [...state.rentals, rental] };
      const next = [...state.rentals];
      next[idx] = { ...next[idx], ...rental };
      return { rentals: next };
    }),
  removeRental: (id) =>
    set((state) => ({
      rentals: state.rentals.filter((r) => r._id !== id),
    })),
  ensureRentals: async ({ force } = {}) => {
    if (!force && isFresh(get().rentalsFetchedAt)) return get().rentals;
    const res = await fetch("/api/rentals");
    const data = await res.json();
    const rentals = Array.isArray(data) ? data : [];
    set({ rentals, rentalsFetchedAt: Date.now() });
    return rentals;
  },

  orders: [],
  ordersFetchedAt: null,
  setOrders: (orders) => set({ orders, ordersFetchedAt: Date.now() }),
  upsertOrder: (order) =>
    set((state) => {
      const idx = state.orders.findIndex((o) => o._id === order._id);
      if (idx === -1) return { orders: [order, ...state.orders] };
      const next = [...state.orders];
      next[idx] = { ...next[idx], ...order };
      return { orders: next };
    }),
  ensureOrders: async ({ force } = {}) => {
    if (!force && isFresh(get().ordersFetchedAt)) return get().orders;
    const res = await fetch("/api/orders");
    const data = await res.json();
    const orders = Array.isArray(data) ? data : [];
    set({ orders, ordersFetchedAt: Date.now() });
    return orders;
  },

  gpsRegistry: [],
  gpsFetchedAt: null,
  setGpsRegistry: (gpsRegistry) => set({ gpsRegistry, gpsFetchedAt: Date.now() }),
  ensureGpsRegistry: async ({ force } = {}) => {
    if (!force && isFresh(get().gpsFetchedAt)) return get().gpsRegistry;
    const res = await fetch("/api/car-gps");
    const data = await res.json();
    const gpsRegistry = Array.isArray(data) ? data : [];
    set({ gpsRegistry, gpsFetchedAt: Date.now() });
    return gpsRegistry;
  },
}));
