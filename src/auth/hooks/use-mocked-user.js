// import { _mock } from 'src/_mock';

// To get the user from the <AuthContext/>, you can use

// Change:
// import { useMockedUser } from 'src/auth/hooks';
// const { user } = useMockedUser();

// To:
// import { useAuthContext } from 'src/auth/hooks';
// const { user } = useAuthContext();

// ----------------------------------------------------------------------
import { useState, useEffect } from 'react';

import { useAuthContext } from 'src/auth/hooks';

import { useSendUserEmail } from './useSendUserEmail';

export function useMockedUser() {
  const { user: authUser } = useAuthContext();
  const { sendUserEmailToBackend } = useSendUserEmail();

  const [user, setUser] = useState(() => {
    const cachedUser = localStorage.getItem("cachedUser");
    return cachedUser ? JSON.parse(cachedUser) : null;
  });
  
  const [loading, setLoading] = useState(!user); // If no cache, show loading

  useEffect(() => {
    async function fetchUserData() {
      if (!authUser?.email) {
        // ✅ Clear cached user when logged out
        localStorage.removeItem("cachedUser");
        setUser(null);
        setLoading(false);
        return;
      }

      if (authUser.email && (!user || user.email !== authUser.email)) {
        // ✅ Fetch new user data only if email changes
        setLoading(true);
        const userData = await sendUserEmailToBackend(authUser);
        if (userData) {
          setUser(userData);  // ✅ Store API response in state
          localStorage.setItem("cachedUser", JSON.stringify(userData));  // ✅ Cache for future use
        }
        setLoading(false); 
      }
    }
    
    fetchUserData();
  }, [authUser?.email]); // Runs only when `authUser.email` changes

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
