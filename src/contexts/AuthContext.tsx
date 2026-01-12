import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setUserContext, clearUserContext } from '@/lib/sentry';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update Sentry user context
        if (session?.user) {
          setUserContext({
            id: session.user.id,
            email: session.user.email,
          });
        } else {
          clearUserContext();
        }

        // Sync session with Chrome extension (if installed)
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          console.log('[AuthContext] Syncing session with extension...');
          window.postMessage({
            type: 'TICKER_BUDDY_SESSION_SYNC',
            session,
          }, window.location.origin);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Update Sentry user context
      if (session?.user) {
        setUserContext({
          id: session.user.id,
          email: session.user.email,
        });
      }

      // Sync existing session with Chrome extension (if installed)
      if (session) {
        console.log('[AuthContext] Syncing existing session with extension...');
        window.postMessage({
          type: 'TICKER_BUDDY_SESSION_SYNC',
          session,
        }, window.location.origin);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      return { error };
    }

    // Wait for profile creation with retry logic (protects against race conditions)
    // The handle_new_user() trigger should create the profile, but we verify it exists
    if (data?.user?.id) {
      const userId = data.user.id;
      const maxRetries = 5;
      const retryDelay = 500; // ms

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile) {
          // Profile created successfully
          return { error: null };
        }

        // If last attempt and still no profile, return error
        if (attempt === maxRetries - 1) {
          console.error('Profile creation failed after retries:', profileError);
          return {
            error: new Error('Account created but profile setup failed. Please contact support.')
          };
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
