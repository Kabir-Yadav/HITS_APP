import { useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';
import { paginationClasses } from '@mui/material/Pagination';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

const ITEMS_PER_PAGE = 6;

export function ApplicationList({ applications, onUpdateStatus }) {
  const [page, setPage] = useState(1);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Calculate pagination
  const totalPages = Math.ceil(applications.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedApplications = applications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const renderApplicationItem = (application) => {
    const {
      id,
      applicant_name,
      email,
      phone_number,
      status,
      created_at,
      jobs,
      resume_url,
    } = application;

    const handleUpdateStatus = (newStatus) => {
      onUpdateStatus(id, newStatus);
    };

    const getResumeUrl = () => {
      if (!resume_url) return '#';
      return resume_url;
    };

    return (
      <Grid key={id} item xs={12} sm={6} md={4}>
        <Card sx={{ p: 3, height: '100%' }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" noWrap>
                {applicant_name}
              </Typography>

              <Label
                variant="soft"
                color={
                  (status === 'shortlisted' && 'success') ||
                  (status === 'rejected' && 'error') ||
                  'warning'
                }
              >
                {status}
              </Label>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                ID: {id}
              </Typography>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:user-id-bold" width={16} />
                <Typography variant="body2">{jobs?.title || 'N/A'}</Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:phone-bold" width={16} />
                <Typography variant="body2">{phone_number}</Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="eva:email-fill" width={16} />
                <Typography variant="body2" noWrap>
                  {email}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:calendar-bold" width={16} />
                <Typography variant="body2">{fDateTime(created_at)}</Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                fullWidth
                component="a"
                href={getResumeUrl()}
                target="_blank"
                variant="outlined"
                startIcon={<Iconify icon="eva:file-text-fill" />}
              >
                Resume
              </Button>

              {status === 'pending' && (
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Shortlist">
                    <IconButton 
                      color="success" 
                      onClick={() => handleUpdateStatus('shortlisted')}
                      sx={{
                        '&:hover': {
                          bgcolor: 'success.lighter',
                        },
                      }}
                    >
                      <Iconify icon="eva:checkmark-circle-2-fill" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Reject">
                    <IconButton 
                      color="error" 
                      onClick={() => handleUpdateStatus('rejected')}
                      sx={{
                        '&:hover': {
                          bgcolor: 'error.lighter',
                        },
                      }}
                    >
                      <Iconify icon="solar:close-circle-bold" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Stack>
          </Stack>
        </Card>
      </Grid>
    );
  };

  return (
    <Stack spacing={3}>
      <Box
        gap={3}
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        }}
      >
        {paginatedApplications.map((application) => renderApplicationItem(application))}
      </Box>

      {applications.length > ITEMS_PER_PAGE && (
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
    </Stack>
  );
}

ApplicationList.propTypes = {
  applications: PropTypes.array,
  onUpdateStatus: PropTypes.func,
}; 