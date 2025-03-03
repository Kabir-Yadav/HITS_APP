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

// Function to replace the Google OAuth text dynamically
function replaceGoogleOAuthText() {
    const observer = new MutationObserver((mutations, obs) => {
        const button = document.querySelector("button[jscontroller='Q0LEBb']");
        if (button) {
            console.log("Button found, changing text to 'EmployeeOS'"); // Log when button is found
            button.textContent = "EmployeeOS"; // Change text
            obs.disconnect(); // Stop observing once the change is made
        }
    });

    // Check every 500ms for the button if it doesn't appear immediately
    const interval = setInterval(() => {
        const button = document.querySelector("button[jscontroller='Q0LEBb']");
        if (button) {
            console.log("Button found in interval check, changing text to 'EmployeeOS'"); // Log when button is found in interval
            button.textContent = "EmployeeOS"; // Change text
            clearInterval(interval); // Stop checking once the change is made
        }
    }, 500);

    // Start observing the body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Run when the document is loaded
document.addEventListener("DOMContentLoaded", replaceGoogleOAuthText);