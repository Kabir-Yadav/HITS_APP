import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { ApplicationDetailsView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export default function ApplicationDetailsPage() {
  const params = useParams();

  const { id } = params;

  return (
    <>
      <Helmet>
        <title> Application Details | HRMS</title>
      </Helmet>

      <ApplicationDetailsView id={id} />
    </>
  );
} 