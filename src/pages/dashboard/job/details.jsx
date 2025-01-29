import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { JobDetailsView } from 'src/sections/job/view';

// ----------------------------------------------------------------------

const metadata = { title: `Job details | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  const { id = '' } = useParams();

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <JobDetailsView id={id} />
    </>
  );
}
