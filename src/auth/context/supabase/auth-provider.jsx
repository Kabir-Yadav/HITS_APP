import dayjs from 'dayjs';
import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import axios from 'src/lib/axios';
import { supabase } from 'src/lib/supabase';

import { AuthContext } from '../auth-context';

// ----------------------------------------------------------------------

export function AuthProvider({ children }) {
  const router = useRouter();
  const { state, setState } = useSetState({ user: null, loading: true });

  const checkUserSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setState({ user: null, loading: false });
        console.error(error);
        throw error;
      }

      if (session) {
        const accessToken = session?.access_token;

        setState({ user: { ...session, ...session?.user }, loading: false });
        axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

        // Get returnTo from URL if it exists
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo');

        // If there's a returnTo parameter, use it, otherwise go to /dashboard/user/dashboard
        if (returnTo) {
          router.push(returnTo);
        } else {
          router.push('/dashboard/user/dashboard');
        }
      } else {
        setState({ user: null, loading: false });
        delete axios.defaults.headers.common.Authorization;
      }
    } catch (error) {
      console.error(error);
      setState({ user: null, loading: false });
    }
  }, [setState, router]);

  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? {
            ...state.user,
            id: state.user?.id,
            accessToken: state.user?.access_token,
            displayName: `${state.user?.user_metadata.firstName || ''} ${state.user?.user_metadata.lastName || ''}`.trim(),
            role: state.user?.user_metadata?.role || 'HR',
            dateOfBirth: state.user?.user_metadata?.dateOfBirth 
              ? dayjs(state.user?.user_metadata?.dateOfBirth, 'DD/MM/YYYY').format('DD/MM/YYYY')
              : null,
          }
        : null,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, state.user, status]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
