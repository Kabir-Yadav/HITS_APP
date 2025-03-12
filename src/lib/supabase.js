import { createClient } from '@supabase/supabase-js';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const isSupabase = CONFIG.auth.method === 'supabase';

const supabaseUrl = CONFIG.supabase.url;
const supabaseKey = CONFIG.supabase.key;

// ----------------------------------------------------------------------

export const supabase = isSupabase ? createClient(supabaseUrl, supabaseKey) : {};

// ----------------------------------------------------------------------

export const signInWithGoogle = async () => {
  try {
    // Add email domain validation
    const validateEmailDomain = email => email.endsWith('@f13.tech');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/supabase/callback`,
        queryParams: {
          login_hint: 'EmployeeOS',
          hd: 'f13.tech'
        },
        theme: {
          brandColor: '#000000',
          logoUrl: 'https://prhsilyjzxbkufchywxt.supabase.co/storage/v1/object/public/F13%20Logo//F13-logo-new.png' 
        }
      },
    });

    if (error) throw error;
    
    // Check user's email after sign in
    const session = await supabase.auth.getSession();
    const userEmail = session?.data?.session?.user?.email;
    
    if (!validateEmailDomain(userEmail)) {
      await supabase.auth.signOut();
      throw new Error('Only @f13.tech email addresses are allowed');
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUserRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('role')
      .eq('auth.users.id', userId)
      .single();

    if (error) throw error;
    return { role: data?.role || 'user', error: null };
  } catch (error) {
    return { role: 'user', error };
  }
};

export const handleAuthStateChange = (callback) => 
  supabase.auth.onAuthStateChange(callback);