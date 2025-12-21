import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  getCurrentCognitoUser, 
  cognitoSignOut, 
  getAuthSession,
  type CognitoUser 
} from './auth';
import type { User } from '@/types/database';

interface AuthState {
  // Cognito user (from AWS)
  user: CognitoUser | null;
  // Profile from database
  profile: User | null;
  // Loading state
  loading: boolean;
  // Email verification status
  isVerified: boolean;
  // Access token for API calls
  accessToken: string | null;
  
  // Actions
  setUser: (user: CognitoUser | null) => void;
  setProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  setVerified: (verified: boolean) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  signOut: () => Promise<void>;
  
  // Initialize auth state from Cognito
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      loading: true,
      isVerified: false,
      accessToken: null,
      
      setUser: (user) => set({ 
        user, 
        isVerified: user?.emailVerified ?? false, 
        loading: false 
      }),
      
      setProfile: (profile) => set({ profile }),
      
      setLoading: (loading) => set({ loading }),
      
      setVerified: (verified) => set({ isVerified: verified }),
      
      setAccessToken: (accessToken) => set({ accessToken }),
      
      logout: () => set({ 
        user: null, 
        profile: null, 
        isVerified: false, 
        accessToken: null 
      }),
      
      signOut: async () => {
        try {
          await cognitoSignOut();
        } catch (error) {
          console.error('Sign out error:', error);
        }
        set({ 
          user: null, 
          profile: null, 
          isVerified: false, 
          accessToken: null 
        });
      },
      
      // Initialize auth state on app load
      initializeAuth: async () => {
        set({ loading: true });
        try {
          const user = await getCurrentCognitoUser();
          if (user) {
            const session = await getAuthSession();
            set({ 
              user, 
              isVerified: user.emailVerified,
              accessToken: session.accessToken || null,
              loading: false 
            });
          } else {
            set({ 
              user: null, 
              profile: null, 
              isVerified: false, 
              accessToken: null,
              loading: false 
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ 
            user: null, 
            profile: null, 
            isVerified: false, 
            accessToken: null,
            loading: false 
          });
        }
      },
      
      // Refresh the session token
      refreshSession: async () => {
        try {
          const session = await getAuthSession();
          if (session.isValid) {
            set({ accessToken: session.accessToken || null });
          }
        } catch (error) {
          console.error('Session refresh error:', error);
        }
      },
    }),
    {
      name: 'phaserai-auth',
      partialize: (state) => ({ 
        user: state.user, 
        profile: state.profile, 
        isVerified: state.isVerified 
      }),
    }
  )
);
