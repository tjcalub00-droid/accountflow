'use client';

import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const finishSignIn = async () => {
      const supabase = createClient();
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          navigate('/login', { replace: true });
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          navigate('/login', { replace: true });
          return;
        }
      }
      navigate('/', { replace: true });
    };
    void finishSignIn();
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Finishing sign in…
    </main>
  );
}
