import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/global-config';

import { CCTVView } from 'src/sections/overview/course/view';

// ----------------------------------------------------------------------

const metadata = { title: `Course | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CCTVView />
    </>
  );
}
