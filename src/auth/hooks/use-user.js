// import { _mock } from 'src/_mock';

// To get the user from the <AuthContext/>, you can use

// Change:
// import { useMockedUser } from 'src/auth/hooks';
// const { user } = useMockedUser();

// To:
// import { useAuthContext } from 'src/auth/hooks';
// const { user } = useAuthContext();

// ----------------------------------------------------------------------
// ✅ Updated Supabase-based User Hook
import { useState, useEffect } from 'react';

import { supabase } from 'src/lib/supabase';

export function useMockedUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();


      if (error || !authUser) {
        setUser(null);
        setLoading(false);
        return;
      }


      // Fetch additional profile details from your profiles table if needed
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setUser({ ...user });
      } else {
        setUser({ ...user, ...profile });
      }

      setLoading(false);
    };

    fetchUser();

    // Auth state change listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}


// export function useMockedUser() {
//   const user = {
//     id: '8864c717-587d-472a-929a-8e5f298024da-0',
//     displayName: 'Jaydon Frankie',
//     email: 'demo@minimals.cc',
//     photoURL: _mock.image.avatar(24),
//     phoneNumber: _mock.phoneNumber(1),
//     country: _mock.countryNames(1),
//     address: '90210 Broadway Blvd',
//     state: 'California',
//     city: 'San Francisco',
//     zipCode: '94116',
//     about: 'Praesent turpis. Phasellus viverra nulla ut metus varius laoreet. Phasellus tempus.',
//     role: 'admin',
//     isPublic: true,
//   };

//   return { user };
// }
