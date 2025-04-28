import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

const signInPaths = {
  jwt: paths.auth.jwt.signIn,
  auth0: paths.auth.auth0.signIn,
  amplify: paths.auth.amplify.signIn,
  firebase: paths.auth.firebase.signIn,
  supabase: paths.auth.supabase.signIn,
};

export function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const { authenticated, loading } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = async () => {
    if (loading) {
      return;
    }

    // Only redirect to sign in if trying to access protected routes
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/app');
    
    if (!authenticated && isProtectedRoute) {
      // Store the current path in localStorage before redirecting
      localStorage.setItem('redirectAfterLogin', pathname);
      router.replace('/sign-in');
      return;
    }

    // If authenticated and there's a stored redirect path, use it
    if (authenticated) {
      const storedPath = localStorage.getItem('redirectAfterLogin');
      if (storedPath && storedPath !== pathname) {
        localStorage.removeItem('redirectAfterLogin');
        router.replace(storedPath);
        return;
      }
    }

    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
