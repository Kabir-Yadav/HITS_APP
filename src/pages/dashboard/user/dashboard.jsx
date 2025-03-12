import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/global-config';

import { UserDashboardView } from 'src/sections/user/view';

// ----------------------------------------------------------------------

const metadata = { title: `User Dashboard - ${CONFIG.appName}` };

export default function Page() {
    return (
        <>
            <Helmet>
                <title> {metadata.title}</title>
            </Helmet>

            <UserDashboardView />
        </>
    );
}
