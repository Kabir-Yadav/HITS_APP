import { useState, useEffect, useCallback } from 'react';

import { supabase } from 'src/lib/supabase';

// ----------------------------------------------------------------------

export function useApplicationSearch() {
  const [applications, setApplications] = useState([]);

  const getApplications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, jobs(title)')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  }, []);

  useEffect(() => {
    getApplications();
  }, [getApplications]);

  return {
    applications,
    getApplications,
  };
} 