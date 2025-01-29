import { Helmet } from 'react-helmet-async';

import { ApplicationListView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export default function ApplicationListPage() {
  return (
    <>
      <Helmet>
        <title> Applications | HRMS</title>
      </Helmet>

      <ApplicationListView />
    </>
  );
} 