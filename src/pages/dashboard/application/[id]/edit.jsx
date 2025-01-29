import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { ApplicationEditView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export default function ApplicationEditPage() {
  const params = useParams();

  const { id } = params;

  return (
    <>
      <Helmet>
        <title> Edit application | HRMS</title>
      </Helmet>

      <ApplicationEditView id={id} />
    </>
  );
} 