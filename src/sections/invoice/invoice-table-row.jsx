import { useState } from 'react';
import PropTypes from 'prop-types';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import DialogActions from '@mui/material/DialogActions';

import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

export function InvoiceTableRow({ row, selected, onSelectRow, onDeleteRow, detailsHref }) {
  const { intern_name, created_at, issue_date, id } = row;
  const confirm = useBoolean();
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  const handleViewPDF = async () => {
    try {
      // Get the signed URL for the PDF
      const { data: { publicUrl } } = supabase
        .storage
        .from('lor-pdfs')
        .getPublicUrl(`${id}.pdf`);

      setPdfUrl(publicUrl);
      setPdfOpen(true);
    } catch (error) {
      console.error('Error fetching PDF:', error);
    }
  };

  const handleClosePDF = () => {
    setPdfOpen(false);
  };

  const renderPDFDialog = () => (
    <Dialog 
      fullScreen 
      open={pdfOpen} 
      onClose={handleClosePDF}
    >
      <DialogActions sx={{ py: 2, px: 3 }}>
        <Button color="inherit" variant="contained" onClick={handleClosePDF}>
          Close
        </Button>
      </DialogActions>

      <Box sx={{ height: 1, display: 'flex', flexGrow: 1 }}>
        <iframe
          src={pdfUrl}
          title="LOR PDF"
          width="100%"
          height="100%"
          style={{ border: 'none' }}
        />
      </Box>
    </Dialog>
  );

  const renderDeleteDialog = (
    <ConfirmDialog
      open={confirm.value}
      onClose={confirm.onFalse}
      title="Delete"
      content="Are you sure want to delete?"
      action={
        <Button variant="contained" color="error" onClick={onDeleteRow}>
          Delete
        </Button>
      }
    />
  );

  return (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox checked={selected} onClick={onSelectRow} />
      </TableCell>

      <TableCell>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar variant="rounded">
            {intern_name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ typography: 'body2', minWidth: 160 }}>
            {intern_name}
          </Box>
        </Stack>
      </TableCell>

      <TableCell>
        <Box sx={{ typography: 'body2' }}>{fDateTime(created_at)}</Box>
      </TableCell>

      <TableCell>
        <Box sx={{ typography: 'body2' }}>{fDateTime(issue_date)}</Box>
      </TableCell>

      <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title="View PDF">
            <IconButton 
              color="info"
              onClick={handleViewPDF}
            >
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete">
            <IconButton 
              color="error"
              onClick={confirm.onTrue}
            >
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>

      {renderDeleteDialog}
      {renderPDFDialog()}
    </TableRow>
  );
}

InvoiceTableRow.propTypes = {
  onDeleteRow: PropTypes.func,
  onSelectRow: PropTypes.func,
  row: PropTypes.object,
  selected: PropTypes.bool,
  detailsHref: PropTypes.string,
};
