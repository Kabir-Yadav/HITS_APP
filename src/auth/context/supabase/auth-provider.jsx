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

  // Centralized method to update user status
  const updateUserStatus = useCallback(async (userId, status) => {
    try {
      console.log('Updating user status:', { userId, status });

      const { data, error } = await supabase
      .from('user_info') // Ensure this table exists
      .update({ status }) // Update the status field
      .eq('id', userId); // Match the user by ID


      if (error) {
        console.error('Error updating user status:', error);
      } else {
        console.log('User status updated successfully:', data);
      }
    } catch (err) {
      console.error('Error in updateUserStatus:', err);
    }
    
  }, []);

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
        // Extract the user ID from the session object
        const userId = session?.user?.id;
       
        setState({ user: { ...session, ...session?.user }, loading: false });
        axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

         // Update user status to "online"
         if (userId) {
    
          await updateUserStatus(userId, 'online');
        }
        // Get the redirect path from router state
        const location = router.location;
        const from = location?.state?.from || '/dashboard/user/dashboard';

        router.replace(from);
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
