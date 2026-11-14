import { createContext, useContext, useState, type ReactNode } from 'react';
import { type UserProfile, getSavedProfile, saveProfile } from '../lib/profile';

/**
 * ProfileContext — one Context per concern (PROJECT.md §7.5), thin
 * provider wrapping src/lib/profile.ts's plain functions. Same shape as
 * ThemeContext.tsx: reads the saved value on mount, persists on every
 * update.
 */

interface ProfileContextValue {
  profile: UserProfile;
  updateProfile: (partial: Partial<UserProfile>) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => getSavedProfile());

  function updateProfile(partial: Partial<UserProfile>) {
    setProfile((current) => {
      const next: UserProfile = { ...current, ...partial, v: 1 };
      saveProfile(next);
      return next;
    });
  }

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}
