import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function JobApplications({ jobId }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setApplications(data || []);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchApplications();
    }
  }, [jobId]);

  const handleViewResume = (resumeUrl) => {
    window.open(resumeUrl, '_blank');
  };

  if (loading) {
    return null;
  }

  if (!applications.length) {
    return (
      <Card>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            No Applications Yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            There are no applications for this job posting yet.
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Applicant</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Applied On</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell>
                  <Typography variant="subtitle2" noWrap>
                    {application.applicant_name}
                  </Typography>
                </TableCell>

                <TableCell>{application.email}</TableCell>

                <TableCell>{application.phone_number}</TableCell>

                <TableCell>
                  <Box
                    sx={{
                      textTransform: 'capitalize',
                      color: 
                        (application.status === 'rejected' && 'error.main') ||
                        (application.status === 'accepted' && 'success.main') ||
                        'text.secondary',
                    }}
                  >
                    {application.status}
                  </Box>
                </TableCell>

                <TableCell>{fDate(application.created_at)}</TableCell>

                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="View Resume">
                      <IconButton 
                        onClick={() => handleViewResume(application.resume_url)}
                        color="info"
                      >
                        <Iconify icon="solar:file-text-bold" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

JobApplications.propTypes = {
  jobId: PropTypes.string,
}; 