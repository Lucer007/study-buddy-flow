import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const autoSignIn = async () => {
    const testEmail = "test@nudge.app";
    const testPassword = "testpassword123";

    try {
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (signInError && signInError.message.includes("Invalid login credentials")) {
        // If sign in fails, sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              username: "testuser",
              display_name: "Test User",
            },
          },
        });

        if (signUpError) {
          console.error("Auto sign up error:", signUpError);
          toast({
            variant: "destructive",
            title: "Auto-login failed",
            description: signUpError.message,
          });
          return;
        }

        setSession(signUpData.session);
        setUser(signUpData.user);

        // Create profile if it doesn't exist
        if (signUpData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              user_id: signUpData.user.id,
              username: "testuser",
              display_name: "Test User",
              bio: "Testing Nudge features",
            });

          if (profileError && !profileError.message.includes("duplicate")) {
            console.error("Profile creation error:", profileError);
          }
        }
      } else if (signInError) {
        console.error("Auto sign in error:", signInError);
        toast({
          variant: "destructive",
          title: "Auto-login failed",
          description: signInError.message,
        });
      } else {
        setSession(signInData.session);
        setUser(signInData.user);
      }
    } catch (error) {
      console.error("Auto-login error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session, then auto-login if needed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
      } else {
        // No session, auto-login
        autoSignIn();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
