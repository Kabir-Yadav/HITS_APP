import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { FiltersResult, FiltersBlock } from 'src/components/filters-result';

// ----------------------------------------------------------------------

export function JobFiltersResult({ filters, totalResults, sx }) {
  const { state: currentFilters, setFilters } = filters;

  const handleRemoveDepartment = useCallback(
    (inputValue) => {
      const newValue = currentFilters.department.filter((item) => item !== inputValue);
      setFilters('department', newValue);
    },
    [currentFilters.department, setFilters]
  );

  const handleRemoveJoiningType = useCallback(
    (inputValue) => {
      const newValue = currentFilters.joiningType.filter((item) => item !== inputValue);
      setFilters('joiningType', newValue);
    },
    [currentFilters.joiningType, setFilters]
  );

  const handleRemoveIsInternship = useCallback(() => {
    setFilters('isInternship', 'all');
  }, [setFilters]);

  const handleRemovePostedBy = useCallback(() => {
    setFilters('posted_by', '');
  }, [setFilters]);

  const chipProps = {
    size: 'small',
    variant: 'soft',
  };

  return (
    <FiltersResult totalResults={totalResults} onReset={() => filters.resetFilters()} sx={sx}>
      <FiltersBlock label="Department:" isShow={!!currentFilters.department.length}>
        {currentFilters.department.map((item) => (
          <Chip
            {...chipProps}
            key={item}
            label={item}
            onDelete={() => handleRemoveDepartment(item)}
          />
        ))}
      </FiltersBlock>

      <FiltersBlock label="Joining Type:" isShow={!!currentFilters.joiningType.length}>
        {currentFilters.joiningType.map((item) => (
          <Chip
            {...chipProps}
            key={item}
            label={item}
            onDelete={() => handleRemoveJoiningType(item)}
          />
        ))}
      </FiltersBlock>

      <FiltersBlock label="Job Type:" isShow={currentFilters.isInternship !== 'all'}>
        <Chip
          {...chipProps}
          label={currentFilters.isInternship === 'true' ? 'Internship' : 'Full Time'}
          onDelete={handleRemoveIsInternship}
        />
      </FiltersBlock>

      <FiltersBlock label="Posted By:" isShow={!!currentFilters.posted_by}>
        <Chip
          {...chipProps}
          label={currentFilters.posted_by}
          onDelete={handleRemovePostedBy}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
