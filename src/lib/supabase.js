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

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Ensure it's an element
        const button = node.querySelector("button[jscontroller='Q0LBbE']");
        if (button) {
          button.innerText = "EmployeeOS";
        }
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });

// Also update existing buttons on page load
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button[jscontroller='Q0LBbE']").forEach((button) => {
    button.innerText = "EmployeeOS";
  });
});
