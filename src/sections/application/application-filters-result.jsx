import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { fDateRange } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export function ApplicationFiltersResult({
  filters,
  onFilters,
  onResetFilters,
  results,
  sx,
  ...other
}) {
  const handleRemoveStatus = () => {
    onFilters('status', 'all');
  };

  const handleRemoveDate = () => {
    onFilters('startDate', null);
    onFilters('endDate', null);
  };

  const handleRemovePostedBy = () => {
    onFilters('posted_by', '');
  };

  return (
    <Stack spacing={1.5} {...other}>
      <Box sx={{ typography: 'body2' }}>
        <strong>{results}</strong>
        <Box component="span" sx={{ color: 'text.secondary', ml: 0.25 }}>
          results found
        </Box>
      </Box>

      <Stack flexGrow={1} spacing={1} direction="row" flexWrap="wrap" alignItems="center">
        {filters.status !== 'all' && (
          <Block label="Status:">
            <Chip size="small" label={filters.status} onDelete={handleRemoveStatus} />
          </Block>
        )}

        {filters.posted_by && (
          <Block label="Posted By:">
            <Chip size="small" label={filters.posted_by} onDelete={handleRemovePostedBy} />
          </Block>
        )}

        {filters.startDate && filters.endDate && (
          <Block label="Date:">
            <Chip
              size="small"
              label={fDateRange(filters.startDate, filters.endDate)}
              onDelete={handleRemoveDate}
            />
          </Block>
        )}

        <Button
          color="error"
          onClick={onResetFilters}
          sx={{ flexShrink: 0 }}
        >
          Clear
        </Button>
      </Stack>
    </Stack>
  );
}

ApplicationFiltersResult.propTypes = {
  filters: PropTypes.object,
  onFilters: PropTypes.func,
  onResetFilters: PropTypes.func,
  results: PropTypes.number,
  sx: PropTypes.object,
};

// ----------------------------------------------------------------------

function Block({ label, children, sx, ...other }) {
  return (
    <Stack
      component={Paper}
      variant="outlined"
      spacing={1}
      direction="row"
      sx={{
        p: 1,
        borderRadius: 1,
        overflow: 'hidden',
        borderStyle: 'dashed',
        ...sx,
      }}
      {...other}
    >
      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {label}
      </Box>

      <Stack spacing={1} direction="row" flexWrap="wrap">
        {children}
      </Stack>
    </Stack>
  );
}

Block.propTypes = {
  children: PropTypes.node,
  label: PropTypes.string,
  sx: PropTypes.object,
}; 