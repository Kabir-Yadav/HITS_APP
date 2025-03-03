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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/supabase/callback`,
        queryParams: {
          login_hint: 'EmployeeOS',
        }
      },
    });

    if (error) throw error;
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

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
      let button = document.querySelector("button[jscontroller='Q0LEBb']");
      if (button) {
          button.innerText = "EmployeeOS";
      }

      let spanText = document.querySelector("span[jslot]");
      if (spanText && spanText.innerText.includes("supabase.co")) {
          spanText.innerText = "EmployeeOS";
      }

      let oauthText = document.querySelector("div[id='headingSubtext'] span");
      if (oauthText && oauthText.innerText.includes("supabase.co")) {
          oauthText.innerText = "EmployeeOS";
      }
  }, 500); 
});
