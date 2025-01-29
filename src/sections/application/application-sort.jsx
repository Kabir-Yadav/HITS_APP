import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function ApplicationSort({ sort, onSort }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
      }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Sort by:
      </Typography>

      <Select
        value={sort}
        onChange={(event) => onSort(event.target.value)}
        size="small"
        sx={{
          minWidth: 120,
          '& .MuiSelect-select': {
            typography: 'body2',
          },
        }}
      >
        <MenuItem value="latest">Latest</MenuItem>
        <MenuItem value="oldest">Oldest</MenuItem>
      </Select>
    </Box>
  );
}

ApplicationSort.propTypes = {
  sort: PropTypes.string,
  onSort: PropTypes.func,
}; 