import { Close as CloseIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import {
  Box,
  Card,
  Typography,
  Grid2,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  Stack,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { OrderDetailsHistory } from './re-history';

export function ReimbursementDetailDialog({ openDetail, setOpenDetail, selectedClaim }) {
  const dummyHistory = {
    orderTime: '2024-01-10T08:30:00Z',
    timeline: [
      { title: 'Submitted', time: '2024-01-10T08:30:00Z' },
      { title: 'Under Review', time: '2024-01-11T10:15:00Z' },
      { title: 'Approved', time: '2024-01-12T14:45:00Z' },
      { title: 'Processed', time: '2024-01-13T09:00:00Z' },
    ],
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={openDetail}
      onClose={() => setOpenDetail(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, minHeight: '60vh', background:'background.neutral'} }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="600">
            Reimbursement Details
          </Typography>
          <IconButton onClick={() => setOpenDetail(false)} size="small" sx={{ color: 'grey.500' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {selectedClaim && (
          <Box
            sx={{
              marginTop: 2,
              p: 2,
              gap: 2,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            <Box sx={{ px: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                }}
              >
                <Typography variant="h6" gutterBottom fontWeight="600">
                  Claim Information
                </Typography>
                <Chip
                  label={selectedClaim.category}
                  variant="outlined"
                  color="primary"
                  sx={{
                    fontWeight: '600',
                    borderWidth: 2,
                    px: 1,
                  }}
                />
              </Box>

              <Grid2 container spacing={2}>
                <Grid2 size={6}>
                  <TextField aria-readonly fullWidth label="ID" value="1231" onChange={(e) => {}} />
                </Grid2>
                <Grid2 size={6}>
                  <TextField
                    aria-readonly
                    fullWidth
                    label="Amount"
                    type="number"
                    value={selectedClaim.amount}
                    onChange={(e) => {}}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Grid2>

                <TextField
                  aria-readonly
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={selectedClaim.description}
                  onChange={(e) => {}}
                  placeholder="e.g., Client dinner at The Restaurant, Flight tickets from NYC to LA"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    fontWeight="600"
                    gutterBottom
                  >
                    Supporting Documents
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      borderStyle: 'dashed',
                      borderColor: 'grey.300',
                      borderRadius: 2,
                    }}
                  >
                    <ReceiptIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography color="text.secondary" variant="body2">
                      Receipt and supporting documents would be displayed here
                    </Typography>
                    <Button variant="outlined" size="small" sx={{ mt: 2 }} disabled>
                      View Documents
                    </Button>
                  </Paper>
                </Box>
              </Grid2>
            </Box>
            <Box minWidth={300}>
              <Typography variant="h6" gutterBottom fontWeight="600" mb={2}>
                Processing Timeline
              </Typography>
              <OrderDetailsHistory history={dummyHistory} />
            </Box>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button variant="outlined" onClick={() => setOpenDetail(false)} size="large">
          Close
        </Button>
        <Button variant="contained" size="large" disabled={selectedClaim?.status !== 'Pending'}>
          Edit Claim
        </Button>
      </DialogActions>
    </Dialog>
  );
}
