import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { JobNewEditForm } from 'src/sections/job/job-new-edit-form';

// ----------------------------------------------------------------------

export function JobCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create a new Job Role & Opening"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Job', href: paths.dashboard.job.root },
          { name: 'Create Job' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <JobNewEditForm />
    </DashboardContent>
  );
}
