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

    // Get returnTo from URL if it exists
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');

    if (!authenticated) {
      const { method } = CONFIG.auth;
      const signInPath = signInPaths[method];
      
      // If we're not on the sign-in page, save current path
      if (!pathname.includes(signInPath)) {
        const redirectPath = `${signInPath}?returnTo=${encodeURIComponent(pathname)}`;
        router.replace(redirectPath);
      }
      return;
    }

    // If authenticated and there's a returnTo, go there
    if (returnTo) {
      router.replace(returnTo);
    } else if (pathname === '/') {
      // If on root path, redirect to user dashboard
      router.replace(paths.dashboard.user.root);
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
