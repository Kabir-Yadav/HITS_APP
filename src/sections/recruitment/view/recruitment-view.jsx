import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { useBoolean } from 'src/hooks/use-boolean';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { RejectedSection } from '../rejected-section';
import { SelectionSection } from '../selection-section';
import { OnboardingSection } from '../onboarding-section';
import { RecruitmentSearch } from '../recruitment-search';
import { RecruitmentFilters } from '../recruitment-filters';
import { TelephoneRoundSection } from '../telephone-round-section';
import { TechnicalRoundSection } from '../technical-round-section';
import { RecruitmentFiltersResult } from '../recruitment-filters-result';

// ----------------------------------------------------------------------

const defaultFilters = {
  jobId: '',
  interviewer: '',
  status: 'all',
  startDate: null,
  endDate: null,
};

// ----------------------------------------------------------------------

export default function RecruitmentView() {
  const [currentTab, setCurrentTab] = useState(0);
  const [filters, setFilters] = useState(defaultFilters);
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');

  const openFilters = useBoolean();
  const openDateRange = useBoolean();

  const dateError = filters.startDate && filters.endDate ? filters.startDate > filters.endDate : false;

  const canReset = !!(
    filters.jobId ||
    filters.interviewer ||
    filters.status !== 'all' ||
    (filters.startDate && filters.endDate)
  );

  useEffect(() => {
    if (tabParam) {
      setCurrentTab(parseInt(tabParam, 10));
    }
  }, [tabParam]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleFilters = (name, value) => {
    setFilters((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const renderFilters = (
    <Stack
      spacing={3}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-end', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
    >
      <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
        <RecruitmentSearch />

        <RecruitmentFilters
          filters={filters}
          onFilters={handleFilters}
          canReset={canReset}
          onResetFilters={handleResetFilters}
          dateError={dateError}
          open={openFilters.value}
          onOpen={openFilters.onTrue}
          onClose={openFilters.onFalse}
          openDateRange={openDateRange.value}
          onCloseDateRange={openDateRange.onFalse}
          onOpenDateRange={openDateRange.onTrue}
        />
      </Stack>
    </Stack>
  );

  const renderResults = (
    <RecruitmentFiltersResult
      filters={filters}
      onFilters={handleFilters}
      onResetFilters={handleResetFilters}
      canReset={canReset}
      sx={{ mb: 5 }}
    />
  );

  return (
    <Container maxWidth={false}>
      <CustomBreadcrumbs
        heading="Recruitment"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Recruitment' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <Card>
        <Box sx={{ px: 3, py: 2.5 }}>
          {renderFilters}

          {canReset && renderResults}
        </Box>

        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            px: 3,
            mb: 2,
            borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
          }}
        >
          <Tab label="Telephone Round" />
          <Tab label="Technical Round" />
          <Tab label="Onboarding" />
          <Tab label="Selected" />
          <Tab label="Rejected" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {currentTab === 0 && <TelephoneRoundSection filters={filters} />}
          {currentTab === 1 && <TechnicalRoundSection filters={filters} />}
          {currentTab === 2 && <OnboardingSection filters={filters} />}
          {currentTab === 3 && <SelectionSection filters={filters} />}
          {currentTab === 4 && <RejectedSection filters={filters} />}
        </Box>
      </Card>
    </Container>
  );
} 