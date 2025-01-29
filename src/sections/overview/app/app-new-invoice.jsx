import PropTypes from 'prop-types';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export function AppNewInvoice({ title, tableData, headCells }) {
  return (
    <Card>
      <Typography variant="h6" sx={{ p: 3 }}>
        {title}
      </Typography>

      <TableContainer>
        <Scrollbar>
          <Table>
            <TableHead>
              <TableRow>
                {headCells.map((headCell) => (
                  <TableCell key={headCell.id}>{headCell.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.applicantName}</TableCell>
                  <TableCell>{row.jobTitle}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{row.stage}</TableCell>
                  <TableCell>{row.interviewer}</TableCell>
                  <TableCell>{fDateTime(row.scheduleDate)}</TableCell>
                </TableRow>
              ))}

              <TableNoData notFound={!tableData.length} />
            </TableBody>
          </Table>
        </Scrollbar>
      </TableContainer>
    </Card>
  );
}

AppNewInvoice.propTypes = {
  headCells: PropTypes.array,
  tableData: PropTypes.array,
  title: PropTypes.string,
};
