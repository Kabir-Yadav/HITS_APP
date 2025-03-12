import { useState, useCallback } from 'react';

import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

import { usePathname, useSearchParams } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { SeoIllustration } from 'src/assets/illustrations';
import {
    _appAuthors, _appRelated, _appFeatured, _appInvoices, _appInstalled,
    _userAbout, _userFeeds, _userFriends, _userGallery, _userFollowers,
    _analyticPosts, _analyticOrderTimeline, _analyticTraffic, _analyticTasks
} from 'src/_mock';

import { Iconify } from 'src/components/iconify';

import { AppWelcome } from 'src/sections/overview/app/app-welcome';
import { AppFeatured } from 'src/sections/overview/app/app-featured';
import { AnalyticsNews } from 'src/sections/overview/analytics/analytics-news';
import { AppUpcomingBirthdays } from 'src/sections/overview/app/app-top-authors';
import { AnalyticsTasks } from 'src/sections/overview/analytics/analytics-tasks';
import { AnalyticsWidgetSummary } from 'src/sections/overview/analytics/analytics-widget-summary';

import { useAuthContext } from 'src/auth/hooks';
// ----------------------------------------------------------------------


const NAV_ITEMS = [
    {
        value: '',
        label: `About Me`,
        icon: <Iconify width={24} icon="solar:user-id-bold" />,
    }
];

// ----------------------------------------------------------------------

const TAB_PARAM = 'tab';

export function UserDashboardView() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selectedTab = searchParams.get(TAB_PARAM) ?? '';
    const theme = useTheme();

    const { user } = useAuthContext();

    const [searchFriends, setSearchFriends] = useState('');

    const handleSearchFriends = useCallback((event) => {
        setSearchFriends(event.target.value);
    }, []);

    const createRedirectPath = (currentPath, query) => {
        const queryString = new URLSearchParams({ [TAB_PARAM]: query }).toString();
        return query ? `${currentPath}?${queryString}` : currentPath;
    };

    // Get full name from metadata
    const fullName = `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`;

    return (
        <DashboardContent maxWidth="xl">
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <AppWelcome
                        title={`Welcome back 👋 \n ${fullName}`}
                        description="If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything."
                        img={<SeoIllustration hideBackground />}
                        action={
                            <Button variant="contained" color="primary">
                                Go now
                            </Button>
                        }
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <AppFeatured list={_appFeatured} />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <AnalyticsWidgetSummary
                        title="Weekly sales"
                        percent={2.6}
                        total={714000}
                        icon={
                            <img
                                alt="Weekly sales"
                                src={`${CONFIG.assetsDir}/assets/icons/glass/ic-glass-bag.svg`}
                            />
                        }
                        chart={{
                            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                            series: [22, 8, 35, 50, 82, 84, 77, 12],
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <AnalyticsWidgetSummary
                        title="New users"
                        percent={-0.1}
                        total={1352831}
                        color="secondary"
                        icon={
                            <img
                                alt="New users"
                                src={`${CONFIG.assetsDir}/assets/icons/glass/ic-glass-users.svg`}
                            />
                        }
                        chart={{
                            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                            series: [56, 47, 40, 62, 73, 30, 23, 54],
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <AnalyticsWidgetSummary
                        title="OnBoarding"
                        percent={2.8}
                        total={1723315}
                        color="warning"
                        icon={
                            <img
                                alt="OnBoarding"
                                src={`${CONFIG.assetsDir}/assets/icons/glass/ic-glass-buy.svg`}
                            />
                        }
                        chart={{
                            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                            series: [40, 70, 50, 28, 70, 75, 7, 64],
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <AnalyticsWidgetSummary
                        title="Messages"
                        percent={3.6}
                        total={234}
                        color="error"
                        icon={
                            <img
                                alt="Messages"
                                src={`${CONFIG.assetsDir}/assets/icons/glass/ic-glass-message.svg`}
                            />
                        }
                        chart={{
                            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                            series: [56, 30, 23, 54, 47, 40, 62, 73],
                        }}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 12 }}>
                    <AnalyticsNews title="News" list={_analyticPosts} />
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <AppUpcomingBirthdays title="UpComing Birthdays" list={_appAuthors} />
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 8 }}>
                    <AnalyticsTasks title="Tasks" list={_analyticTasks} />
                </Grid>
            </Grid>
        </DashboardContent>
    );
}
