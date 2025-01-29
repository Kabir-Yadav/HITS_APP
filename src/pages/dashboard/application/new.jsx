import { Helmet } from 'react-helmet-async';

import { ApplicationCreateView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export default function ApplicationCreatePage() {
  return (
    <>
      <Helmet>
        <title> Create a new application | HRMS</title>
      </Helmet>

      <ApplicationCreateView />
    </>
  );
} 