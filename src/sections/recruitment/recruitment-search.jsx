import PropTypes from 'prop-types';

import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function RecruitmentSearch({ query, onSearch }) {
  return (
    <TextField
      size="small"
      value={query}
      onChange={(event) => onSearch(event.target.value)}
      placeholder="Search applicant name..."
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
          </InputAdornment>
        ),
      }}
      sx={{ width: { xs: 1, sm: 240 } }}
    />
  );
}

RecruitmentSearch.propTypes = {
  query: PropTypes.string,
  onSearch: PropTypes.func,
}; 