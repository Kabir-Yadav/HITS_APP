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
  // Function to replace any Supabase URL text with EmployeeOS
  function replaceSupabaseText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Check if the text contains the Supabase URL
      if (node.textContent.includes("supabase.co")) {
        // Replace the text with EmployeeOS
        node.textContent = node.textContent.replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS");
      }
    } else {
      // For elements, we check their innerText and specific attributes
      if (node.innerText && node.innerText.includes("supabase.co")) {
        node.innerText = node.innerText.replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS");
      }
      
      // Also check data-destination-info attribute which seems to contain the URL
      if (node.getAttribute && node.getAttribute("data-destination-info") && 
          node.getAttribute("data-destination-info").includes("supabase.co")) {
        const newValue = node.getAttribute("data-destination-info").replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS");
        node.setAttribute("data-destination-info", newValue);
      }
    }
  }

  // Function to recursively scan all nodes
  function scanNodes(root) {
    // Process the root node
    replaceSupabaseText(root);
    
    // Process all child nodes
    const children = root.childNodes;
    for (let i = 0; i < children.length; i++) {
      scanNodes(children[i]);
    }
  }

  // Observer for detecting when new elements are added to the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // For added nodes
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          scanNodes(mutation.addedNodes[i]);
        }
      }
      
      // For changed text nodes
      if (mutation.type === 'characterData') {
        replaceSupabaseText(mutation.target);
      }
    });
    
    // Also do a full document scan periodically to catch anything missed
    scanNodes(document.body);
  });

  // Start observing with all possible options
  observer.observe(document.body, { 
    childList: true,      // Watch for added/removed nodes
    subtree: true,        // Watch the entire subtree
    characterData: true,  // Watch for text changes
    attributes: true      // Watch for attribute changes
  });
  
  // Initial scan of the document to catch already loaded content
  if (document.body) {
    scanNodes(document.body);
  }
});