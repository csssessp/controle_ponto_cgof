import { create } from 'zustand';
import { supabase, Profile } from '@/src/lib/supabase';

interface AuthState {
  profile: Profile | null;
  isLoading: boolean;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  isLoading: true,
  setProfile: (profile) => set({ profile, isLoading: false }),
  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    set({ profile: null });
  },
}));

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentOrganization: string | null;
  setCurrentOrganization: (id: string | null) => void;
  lastUpload: string | null;
  setLastUpload: (ts: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  currentOrganization: null,
  setCurrentOrganization: (id) => set({ currentOrganization: id }),
  lastUpload: null,
  setLastUpload: (ts) => set({ lastUpload: ts }),
}));
