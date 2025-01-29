import { useState, useCallback } from 'react';

import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import { useNavigate } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';

import { useApplicationSearch } from './hooks/use-application-search';

// ----------------------------------------------------------------------

export function ApplicationSearch() {
  const navigate = useNavigate();

  const { applications } = useApplicationSearch();

  const [searchApplication, setSearchApplication] = useState('');

  const handleChangeSearch = useCallback((value) => {
    setSearchApplication(value);
  }, []);

  const handleGotoApplication = useCallback(
    (id) => {
      navigate(paths.dashboard.application.details(id));
    },
    [navigate]
  );

  const handleKeyUp = useCallback(
    (event) => {
      if (searchApplication && event.key === 'Enter') {
        handleGotoApplication(searchApplication);
      }
    },
    [handleGotoApplication, searchApplication]
  );

  return (
    <Autocomplete
      size="small"
      autoHighlight
      popupIcon={null}
      options={applications}
      onInputChange={(event, value) => handleChangeSearch(value)}
      getOptionLabel={(option) => option.id}
      noOptionsText={<Typography variant="body2">No results found</Typography>}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      componentsProps={{
        paper: {
          sx: {
            width: 400,
          },
        },
      }}
      sx={{ width: 400 }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search..."
          onKeyUp={handleKeyUp}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      )}
      renderOption={(props, application) => (
        <MenuItem
          {...props}
          onClick={() => handleGotoApplication(application.id)}
          sx={{ typography: 'body2', '&:first-of-type': { borderRadius: 1 } }}
        >
          <Typography variant="subtitle2" sx={{ mr: 1 }}>
            {application.id}
          </Typography>
          {application.applicant_name}
        </MenuItem>
      )}
    />
  );
} 