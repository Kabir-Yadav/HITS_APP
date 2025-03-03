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
      if (node.textContent && node.textContent.includes("supabase.co")) {
        // Replace the text with EmployeeOS
        node.textContent = node.textContent.replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS");
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // For elements, check various properties and attributes
      
      // Check innerText (for block elements)
      if (node.innerText && node.innerText.includes("supabase.co")) {
        node.innerText = node.innerText.replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS");
      }
      
      // Check textContent (works for more elements than innerText)
      if (node.textContent && node.textContent.includes("supabase.co")) {
        // We need to be careful with textContent as it affects child nodes too
        // Only replace if this node doesn't have children with text
        if (node.childNodes.length === 0 || 
            (node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE)) {
          node.textContent = node.textContent.replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS");
        }
      }
      
      // Check all attributes that might contain the URL
      if (node.hasAttributes()) {
        const attrs = node.attributes;
        for (let i = 0; i < attrs.length; i++) {
          const attr = attrs[i];
          if (attr.value && attr.value.includes("supabase.co")) {
            node.setAttribute(attr.name, attr.value.replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS"));
          }
        }
      }
      
      // Special case for the specific element in the screenshot
      if (node.classList && 
          (node.classList.contains("kl-j0b") || node.tagName === "DIV") && 
          node.textContent && node.textContent.includes("supabase.co")) {
        // Force replace all text in this node and its children
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let textNode;
        while (textNode = walker.nextNode()) {
          if (textNode.textContent.includes("supabase.co")) {
            textNode.textContent = textNode.textContent.replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS");
          }
        }
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

  // Specific function to target the "to continue to" line
  function findAndReplaceSpecificElements() {
    // Target the specific "to continue to" text element 
    document.querySelectorAll('span[jslot]').forEach(span => {
      if (span.textContent && span.textContent.includes("to continue to")) {
        let nextElement = span.nextElementSibling;
        if (nextElement && nextElement.textContent.includes("supabase.co")) {
          nextElement.textContent = "EmployeeOS";
        }
        
        // Also handle the case where it's in the same span
        span.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.includes("supabase.co")) {
            node.textContent = node.textContent.replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS");
          }
        });
      }
    });
    
    // Also look for any element containing the text in "to continue to prhsilyjzxbkufchywxt.supabase.co" format
    document.querySelectorAll('*').forEach(el => {
      if (el.textContent && 
          el.textContent.includes("to continue to") && 
          el.textContent.includes("supabase.co")) {
        // Replace just the URL part
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let textNode;
        while (textNode = walker.nextNode()) {
          if (textNode.textContent.includes("supabase.co")) {
            textNode.textContent = textNode.textContent.replace(/[a-z0-9]+\.supabase\.co/g, "EmployeeOS");
          }
        }
      }
    });
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
      
      // After each mutation batch, try our specific element targeting function
      findAndReplaceSpecificElements();
    });
    
    // Also do a full document scan
    scanNodes(document.body);
    findAndReplaceSpecificElements();
  });

  // Start observing with all possible options
  observer.observe(document.body, { 
    childList: true,      // Watch for added/removed nodes
    subtree: true,        // Watch the entire subtree
    characterData: true,  // Watch for text changes
    attributes: true      // Watch for attribute changes
  });
  
  // Initial scan of the document
  if (document.body) {
    scanNodes(document.body);
    findAndReplaceSpecificElements();
  }
  
  // Additional scan after a short delay to catch late-loading elements
  setTimeout(() => {
    scanNodes(document.body);
    findAndReplaceSpecificElements();
  }, 1000);
  
  // Also run on any navigation state changes
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      scanNodes(document.body);
      findAndReplaceSpecificElements();
    }, 500);
  });
});