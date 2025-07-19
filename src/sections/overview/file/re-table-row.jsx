import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import { Stack, Tooltip } from '@mui/material';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import {
  Visibility as VisibilityIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

import { fCurrency } from 'src/utils/format-number';
import { fDate, fTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export function ReTableRow({
  row,
  selected,
  onSelectRow,
  onDetailView,
  handleViewDetails,
  handleApproval,
}) {
  const menuActions = usePopover();

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <li>
          <MenuItem
            onClick={() => {
              handleViewDetails();
              menuActions.onClose();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>
        </li>

        {row.status == 'Pending' && (
          <>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <MenuItem
              onClick={() => {
                handleApproval('approve');
                menuActions.onClose();
              }}
              sx={{ color: 'success.main' }}
            >
              <Iconify icon="ep:success-filled" />
              Approve
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleApproval('reject');
                menuActions.onClose();
              }}
              sx={{ color: 'error.main' }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" />
              Reject
            </MenuItem>
          </>
        )}
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onClick={onSelectRow}
            inputProps={{
              id: `${row.id}-checkbox`,
              'aria-label': `${row.id} checkbox`,
            }}
          />
        </TableCell>

        <TableCell>{row.issuedBy}</TableCell>
        <TableCell>
          <ListItemText
            primary={fDate(row.date)}
            secondary={fTime(row.date)}
            slotProps={{
              primary: { noWrap: true, sx: { typography: 'body2' } },
              secondary: { sx: { mt: 0.5, typography: 'caption' } },
            }}
          />
        </TableCell>

        <TableCell>{row.category}</TableCell>

        <TableCell>{row.description}</TableCell>

        <TableCell>{fCurrency(row.amount)}</TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={
              (row.status === 'Approved' && 'success') ||
              (row.status === 'Pending' && 'warning') ||
              (row.status === 'Rejected' && 'error') ||
              'default'
            }
          >
            {row.status}
          </Label>
        </TableCell>

        <TableCell>
          <Tooltip title="View Receipt">
            <IconButton align="center">
              <Iconify icon="majesticons:receipt-text" />
            </IconButton>
          </Tooltip>
        </TableCell>

        <TableCell align="right" sx={{ px: 1 }}>
          <IconButton color={menuActions.open ? 'inherit' : 'default'} onClick={menuActions.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      {renderMenuActions()}
    </>
  );
}
