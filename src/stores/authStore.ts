import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google' | 'github' | 'microsoft' | 'discord' | 'apple') => Promise<{ error: Error | null }>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    if (get().initialized) return;
    
    set({ loading: true });
    
    try {
      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        set({ user: null, session: null, loading: false, initialized: true });
        return;
      }

      set({ 
        user: session?.user ?? null, 
        session: session,
        loading: false,
        initialized: true 
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ 
          user: session?.user ?? null,
          session: session 
        });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ user: null, session: null, loading: false, initialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ loading: false });
        return { error };
      }

      set({ 
        user: data.user,
        session: data.session,
        loading: false 
      });

      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { 
        error: error instanceof Error ? error : new Error('Failed to sign in') 
      };
    }
  },

  signUp: async (email, password) => {
    set({ loading: true });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        set({ loading: false });
        return { error };
      }

      set({ 
        user: data.user,
        session: data.session,
        loading: false 
      });

      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { 
        error: error instanceof Error ? error : new Error('Failed to sign up') 
      };
    }
  },

  signOut: async () => {
    set({ loading: true });
    
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, loading: false });
    } catch (error) {
      console.error('Error signing out:', error);
      set({ loading: false });
    }
  },

  resetPassword: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('Failed to reset password') 
      };
    }
  },

  signInWithOAuth: async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        return { error };
      }

      // OAuth redirects to provider, so we don't set loading state here
      // The auth state change listener will handle the session update
      return { error: null };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error(`Failed to sign in with ${provider}`) 
      };
    }
  },
}));

