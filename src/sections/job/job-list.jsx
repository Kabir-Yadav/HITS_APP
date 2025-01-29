import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import { paginationClasses } from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { supabase } from 'src/lib/supabase';

import { JobItem } from './job-item';

// ----------------------------------------------------------------------

const ITEMS_PER_PAGE = 6;

export function JobList({ jobs, loading }) {
  const [page, setPage] = useState(1);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleDelete = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(jobs.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedJobs = jobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <>
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
        }}
      >
        {paginatedJobs.map((job) => (
          <JobItem
            key={job.id}
            job={job}
            editHref={paths.dashboard.job.edit(job.id)}
            detailsHref={paths.dashboard.job.details(job.id)}
            onDelete={() => handleDelete(job.id)}
          />
        ))}
      </Box>

      {jobs.length > ITEMS_PER_PAGE && (
        <Pagination
          page={page}
          count={totalPages}
          onChange={handleChangePage}
          sx={{
            mt: { xs: 8, md: 8 },
            [`& .${paginationClasses.ul}`]: { justifyContent: 'center' },
          }}
        />
      )}
    </>
  );
}
