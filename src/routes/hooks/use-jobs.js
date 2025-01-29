import { useState, useEffect } from 'react';

import { supabase } from 'src/lib/supabase';

export function useJobs({ page = 1, limit = 8, filters = {}, sortBy = 'latest' }) {
  const [jobs, setJobs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);

        // Calculate range for pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Start building the query
        let query = supabase.from('jobs').select('*', { count: 'exact' }).range(from, to);

        // Apply filters
        if (filters.department?.length) {
          query = query.in('department', filters.department);
        }
        if (filters.location?.length) {
          query = query.in('location', filters.location);
        }
        if (filters.joining_type?.length) {
          query = query.in('joining_type', filters.joining_type);
        }
        if (typeof filters.is_internship === 'boolean') {
          query = query.eq('is_internship', filters.is_internship);
        }
        if (typeof filters.is_active === 'boolean') {
          query = query.eq('is_active', filters.is_active);
        }

        // Apply sorting
        switch (sortBy) {
          case 'latest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }

        const { data, error: supabaseError, count } = await query;

        if (supabaseError) {
          throw supabaseError;
        }

        setJobs(data);
        setTotalCount(count || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [page, limit, filters, sortBy]);

  return {
    jobs,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setError(null);
    },
  };
}
