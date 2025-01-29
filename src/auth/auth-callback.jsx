import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { paths } from 'src/routes/paths';

import { supabase } from 'src/lib/supabase';

import { useAuthContext } from './hooks';

// ----------------------------------------------------------------------

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkUserSession } = useAuthContext();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error during auth callback:', error.message);
          navigate(paths.auth.supabase.signIn);
          return;
        }

        if (session) {
          await checkUserSession?.();
          navigate(paths.dashboard.root);
        } else {
          navigate(paths.auth.supabase.signIn);
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate(paths.auth.supabase.signIn);
      }
    };

    handleCallback();
  }, [navigate, checkUserSession]);

  return null;
} 