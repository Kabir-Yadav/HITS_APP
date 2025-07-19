import React, { useState } from 'react';

import { Grid2 } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import {
  useTable,
  emptyRows,
  rowInPage,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { ReTableRow } from '../re-table-row';
import ReimbursementFormDialog from '../re-newclaim-dialog';
import { ReimbrusementSummaryCard } from '../re-stats-cards';
import { ReimbursementDetailDialog } from '../re-detail-dialog';

export function OverviewReimbursementView() {
  const TABLE_HEAD = [
    { id: 'issuedBy', label: 'Issued By' },
    { id: 'Date', label: 'Date' },
    { id: 'Category', label: 'Category' },
    { id: 'Description', label: 'Description' },
    { id: 'Amount', label: 'Amount' },
    { id: 'Status', label: 'Status' },
    { id: 'Receipt', label: 'Receipt' },
    { id: '' },
  ];

  const table = useTable({ defaultOrderBy: 'created_at' });
  const theme = useTheme();

  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openApproval, setOpenApproval] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: null,
    dateTo: null,
    status: 'All',
    category: 'All',
    search: '',
  });
  const [formData, setFormData] = useState({
    date: null,
    category: '',
    description: '',
    amount: '',
    receipt: null,
  });
  const [approvalData, setApprovalData] = useState({
    action: '',
    comment: '',
  });

  // Mock data
  const statsData = {
    totalPending: 12,
    approvedThisMonth: 45,
    totalAmount: 15420,
    averageAmount: 342,
  };

  

  const reimbursementData = [
    {
      id: 1,
      issuedBy: 'John Doe',
      date: '2024-01-15',
      category: 'Travel',
      description: 'Flight tickets to conference',
      amount: 850,
      status: 'Pending',
      receipt: '/api/receipt/1.jpg',
      submittedBy: 'John Doe',
    },
    {
      id: 2,
      issuedBy: 'Jane Smith',
      date: '2024-01-12',
      category: 'Meals',
      description: 'Client dinner',
      amount: 120,
      status: 'Approved',
      receipt: '/api/receipt/2.jpg',
      submittedBy: 'Jane Smith',
    },
    {
      id: 3,
      issuedBy: 'Mike Johnson',
      date: '2024-01-10',
      category: 'Supplies',
      description: 'Office supplies',
      amount: 65,
      status: 'Rejected',
      receipt: '/api/receipt/3.jpg',
      submittedBy: 'Mike Johnson',
    },
  ];

  const categories = ['Travel', 'Meals', 'Supplies', 'Transportation', 'Accommodation', 'Other'];
  const statuses = ['All', 'Pending', 'Approved', 'Rejected'];


  const handleFormSubmit = () => {
    console.log('Form submitted:', formData);
    setOpenForm(false);
    setFormData({
      date: null,
      category: '',
      description: '',
      amount: '',
      receipt: null,
    });
  };

  const handleApprovalSubmit = () => {
    console.log('Approval submitted:', approvalData);
    setOpenApproval(false);
    setApprovalData({ action: '', comment: '' });
  };

  const handleViewDetails = (claim) => {
    setSelectedClaim(claim);
    setOpenDetail(true);
  };

  const handleApproval = (claim, action) => {
    setSelectedClaim(claim);
    setApprovalData({ action, comment: '' });
    setOpenApproval(true);
  };

  // Pipeline Status Steps
  const steps = ['Submitted', 'Under Review', 'Approved', 'Processed'];

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Reimbursement Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage and track expense reimbursements
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Box
        sx={{
          gap: 3,
          mb: 4,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        <ReimbrusementSummaryCard
          title="Claims Pending"
          total={statsData.totalPending}
          icon={`${CONFIG.assetsDir}/assets/icons/courses/ic-courses-progress.svg`}
        />

        <ReimbrusementSummaryCard
          title="Claims Accepted"
          total={statsData.approvedThisMonth}
          color="success"
          icon={`${CONFIG.assetsDir}/assets/icons/reimbrusement/ic-bills-completed.svg`}
        />

        <ReimbrusementSummaryCard
          title="Total Amount"
          total={(statsData.totalAmount)}
          color="secondary"
          icon={`${CONFIG.assetsDir}/assets/icons/reimbrusement/ic-money-bag.svg`}
        />

        <ReimbrusementSummaryCard
          title="Claims Overdue"
          total={8}
          color="error"
          icon={`${CONFIG.assetsDir}/assets/icons/reimbrusement/overdue.svg`}
        />
      </Box>
      {/* Reimbursement List */}
      <Card>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">Reimbursement Claims</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenForm(true)}>
              New Claim
            </Button>
          </Box>
          <Box
            component="section"
            sx={{
              display: 'grid',
              gap: 2,
              // 1 column on xs, 2 on sm, 4 equal cols on md+
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: 'repeat(4, 1fr)',
              },
            }}
          >
            {/* From Date */}
            <DatePicker
              label="From Date"
              value={filters.dateFrom}
              onChange={(date) => setFilters((f) => ({ ...f, dateFrom: date }))}
              renderInput={(params) => <TextField {...params} fullWidth size="small" />}
            />

            {/* To Date */}
            <DatePicker
              label="To Date"
              value={filters.dateTo}
              onChange={(date) => setFilters((f) => ({ ...f, dateTo: date }))}
              renderInput={(params) => <TextField {...params} fullWidth size="small" />}
            />

            {/* Status */}
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                {statuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Category */}
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                label="Category"
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              >
                <MenuItem value="All">All</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Free‑text Search */}
            <TextField
              fullWidth
              placeholder="Search…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>

        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            numSelected={table.selected.length}
            rowCount={reimbursementData.length}
            onSelectAllRows={(checked) => {
              table.onSelectAllRows(
                checked,
                reimbursementData.map((row) => row.id)
              );
            }}
            action={
              <Box sx={{ display: 'flex' }}>
                <Tooltip title="Download">
                  <IconButton color="primary">
                    <Iconify icon="eva:download-outline" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Print">
                  <IconButton color="primary">
                    <Iconify icon="solar:printer-minimalistic-bold" />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />
          <Scrollbar sx={{ minHeight: 324 }}>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={reimbursementData.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    reimbursementData.map((row) => row.id)
                  )
                }
              />

              <TableBody>
                {reimbursementData
                  .slice(
                    table.page * table.rowsPerPage,
                    table.page * table.rowsPerPage + table.rowsPerPage
                  )
                  .map((row) => (
                    <ReTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      handleApproval={(action) => handleApproval(row, action)}
                      handleViewDetails={() => handleViewDetails(row)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                    />
                  ))}

                <TableEmptyRows
                  height={table.dense ? 56 : 56 + 20}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, reimbursementData.length)}
                />
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>
        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={reimbursementData.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      <ReimbursementFormDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSubmit={handleFormSubmit}
      />

      {/* Reimbursement Detail Dialog */}
      <ReimbursementDetailDialog
        openDetail={openDetail}
        setOpenDetail={setOpenDetail}
        selectedClaim={selectedClaim}
      />

      {/* Approval Dialog */}
      <Dialog open={openApproval} onClose={() => setOpenApproval(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalData.action === 'approve' ? 'Approve' : 'Reject'} Reimbursement
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Comment"
            multiline
            rows={4}
            value={approvalData.comment}
            onChange={(e) => setApprovalData({ ...approvalData, comment: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApproval(false)}>Cancel</Button>
          <Button
            onClick={handleApprovalSubmit}
            variant="contained"
            color={approvalData.action === 'approve' ? 'success' : 'error'}
          >
            {approvalData.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
