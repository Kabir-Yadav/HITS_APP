import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/global-config';

import { OverviewReimbursementView } from 'src/sections/overview/file/view';

// ----------------------------------------------------------------------

const metadata = { title: `File | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <OverviewReimbursementView />
    </>
  );
}
