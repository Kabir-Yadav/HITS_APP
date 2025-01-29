import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { JobEditView } from 'src/sections/job/view';

// ----------------------------------------------------------------------

const metadata = { title: `Edit job | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  const { id = '' } = useParams();

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <JobEditView id={id} />
    </>
  );
}
