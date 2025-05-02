import 'jspdf-autotable';

import JSZip from 'jszip';
import jsPDF from 'jspdf';
import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import { visuallyHidden } from '@mui/utils';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { fDate } from 'src/utils/format-time';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function JobApplications({ jobId }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderBy, setOrderBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [selected, setSelected] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [jobInfo, setJobInfo] = useState({ title: '', id: '' });
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const cancelRequested = useRef(false);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('job_id', jobId)
          .order(orderBy, { ascending: order === 'asc' });

        if (error) throw error;

        setApplications(data || []);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchJobInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('title, job_id')
          .eq('id', jobId)
          .single();
        if (error) throw error;
        setJobInfo({ title: data?.title || '', id: data?.job_id || '' });
      } catch (error) {
        setJobInfo({ title: '', id: '' });
      }
    };

    if (jobId) {
      fetchApplications();
      fetchJobInfo();
    }
  }, [jobId, orderBy, order]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleViewResume = (resumeUrl) => {
    window.open(resumeUrl, '_blank');
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelected(applications.map((app) => app.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const handleDownloadMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCancelDownload = () => {
    cancelRequested.current = true;
    setProgressMessage('Cancelling...');
  };

  const downloadAsCSV = () => {
    const applicationsToDownload = selected.length > 0 
      ? applications.filter(app => selected.includes(app.id))
      : applications;

    const csvContent = [
      ['Name', 'Email', 'Phone', 'Status', 'Applied On'],
      ...applicationsToDownload.map(app => [
        app.applicant_name,
        app.email,
        app.phone_number,
        app.status,
        fDate(app.created_at)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `job-applications-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleDownloadMenuClose();
  };

  const downloadAsPDF = () => {
    const applicationsToDownload = selected.length > 0 
      ? applications.filter(app => selected.includes(app.id))
      : applications;

    const doc = new jsPDF();
    const pdfTitle = `Job Applications for: ${jobInfo.title} (${jobInfo.id})`;
    doc.text(pdfTitle, 14, 16);
    doc.autoTable({
      startY: 22,
      head: [['Name', 'Email', 'Phone', 'Status', 'Applied On']],
      body: applicationsToDownload.map(app => [
        app.applicant_name,
        app.email,
        app.phone_number,
        app.status,
        fDate(app.created_at)
      ]),
    });
    doc.save(`job-applications-${jobInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}-${jobInfo.id}.pdf`);
    handleDownloadMenuClose();
  };

  const downloadAsZIP = async () => {
    cancelRequested.current = false;
    const applicationsToDownload = selected.length > 0 
      ? applications.filter(app => selected.includes(app.id))
      : applications;

    setDownloading(true);
    setProgress(0);
    setProgressMessage('Preparing to download resumes...');

    if (applicationsToDownload.length === 0) {
      setProgressMessage('No applications to download.');
      setTimeout(() => setDownloading(false), 2000);
      return;
    }

    const zip = new JSZip();
    try {
      const resumesFolder = zip.folder('resumes');
      let completed = 0;
      for (const app of applicationsToDownload) {
        if (cancelRequested.current) {
          setProgressMessage('Download cancelled.');
          setTimeout(() => setDownloading(false), 1200);
          return;
        }
        if (app.resume_url) {
          const fileName = `${app.applicant_name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf`;
          setProgressMessage(`Fetching resume for: ${app.applicant_name}`);
          try {
            const response = await fetch(app.resume_url);
            if (!response.ok) {
              setProgressMessage(`Failed to fetch resume for ${app.applicant_name}`);
              continue;
            }
            const blob = await response.blob();
            resumesFolder.file(fileName, blob);
          } catch (error) {
            setProgressMessage(`Error downloading resume for ${app.applicant_name}`);
            continue;
          }
        }
        completed++;
        setProgress(Math.round((completed / applicationsToDownload.length) * 100));
      }
      if (cancelRequested.current) {
        setProgressMessage('Download cancelled.');
        setTimeout(() => setDownloading(false), 1200);
        return;
      }
      setProgressMessage('Generating ZIP file...');
      setProgress(100);
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resumes_${jobInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}-${jobInfo.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setProgressMessage('Download complete!');
      setTimeout(() => setDownloading(false), 1500);
    } catch (error) {
      setProgressMessage('Error creating or downloading ZIP file.');
      setTimeout(() => setDownloading(false), 2500);
    }
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
      {/* Progress Modal Overlay */}
      <Modal open={downloading} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
        <Box sx={{ bgcolor: 'background.paper', width: 340, height: 240, p: 4, borderRadius: 2, boxShadow: 24, textAlign: 'center', opacity: 0.97, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography 
            variant="h6" 
            sx={{ mb: 3, minHeight: 32, maxWidth: 280, wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.3 }}
          >
            {progressMessage}
          </Typography>
          <CircularProgress variant="determinate" value={progress} size={70} thickness={5} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{progress}%</Typography>
          <Button variant="outlined" color="error" onClick={handleCancelDownload} disabled={progress >= 100 || progressMessage === 'Download complete!'}>
            Cancel
          </Button>
        </Box>
      </Modal>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Iconify icon="eva:download-fill" />}
          onClick={downloadAsZIP}
          disabled={downloading}
        >
          Download {selected.length > 0 ? `(${selected.length} selected)` : 'All'} Resumes
        </Button>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < applications.length}
                  checked={applications.length > 0 && selected.length === applications.length}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell>Applicant</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                  hideSortIcon={false}
                >
                  Status
                  {orderBy === 'status' ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                    </Box>
                  ) : null}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'created_at'}
                  direction={orderBy === 'created_at' ? order : 'asc'}
                  onClick={() => handleRequestSort('created_at')}
                  hideSortIcon={false}
                >
                  Applied On
                  {orderBy === 'created_at' ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                    </Box>
                  ) : null}
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Resume</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.indexOf(application.id) !== -1}
                    onChange={(event) => handleSelectClick(event, application.id)}
                  />
                </TableCell>
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
                        (application.status === 'shortlisted' && 'success.main') ||
                        (application.status === 'pending' && 'warning.main') ||
                        'text.secondary',
                    }}
                  >
                    {application.status}
                  </Box>
                </TableCell>

                <TableCell>{fDate(application.created_at)}</TableCell>

                <TableCell align="right">
                  <Button
                    variant="text"
                    color="info"
                    onClick={() => handleViewResume(application.resume_url)}
                    startIcon={<Iconify icon="solar:file-text-bold" />}
                  >
                    View
                  </Button>
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