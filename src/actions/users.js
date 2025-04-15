import useSWR from 'swr';
import dayjs from 'dayjs';

import { supabase } from 'src/lib/supabase';

async function fetchUpcomingBirthdays() {
    // Fetch user profiles from the view
    const { data, error } = await supabase.from('user_profiles').select('*');
    if (error) throw error;
    if (!Array.isArray(data)) return [];

    // Use startOf('day') to normalize comparisons
    const today = dayjs().startOf('day');

    // Process real users with a valid date_of_birth
    const realUsers = data
        .filter(u => u.date_of_birth) // ensure DOB exists
        .map(u => {
            // Parse the user's DOB (assuming format "YYYY-MM-DD")
            const dob = dayjs(u.date_of_birth, 'YYYY-MM-DD');
            // Build a birthday date for the current year using the month & day from dob
            let nextBirthday = dayjs(`${today.year()}-${dob.format('MM-DD')}`, 'YYYY-MM-DD');
            // If that birthday is before today, then the next birthday is next year
            if (nextBirthday.isBefore(today, 'day')) {
                nextBirthday = nextBirthday.add(1, 'year');
            }
            const daysUntilBirthday = nextBirthday.diff(today, 'day');
            return {
                ...u,
                nextBirthday: nextBirthday.toISOString(),
                daysUntilBirthday,

            };
        });

    // Create a dummy user with birthday today
    const dummyUser = {
        id: 'dummy-user',
        email: 'dummy@example.com',
        name: 'Dummy Birthday',
        avatar_url: '/assets/dummy-avatar.png', // Adjust this path to your dummy image
        date_of_birth: today.format('YYYY-MM-DD')  // Birthday is today
    };

    const dummyDob = dayjs(dummyUser.date_of_birth, 'YYYY-MM-DD');
    let dummyNextBirthday = dayjs(`${today.year()}-${dummyDob.format('MM-DD')}`, 'YYYY-MM-DD');
    // If by any chance today's birthday is considered before today then add one year (normally not needed)
    if (dummyNextBirthday.isBefore(today, 'day')) {
        dummyNextBirthday = dummyNextBirthday.add(1, 'year');
    }
    const dummyDaysUntilBirthday = dummyNextBirthday.diff(today, 'day');

    const dummyProfile = {
        ...dummyUser,
        nextBirthday: dummyNextBirthday.toISOString(),
        daysUntilBirthday: dummyDaysUntilBirthday,
    };

    // Merge the real users with the dummy profile and sort by days remaining
    const combined = [...realUsers, dummyProfile];

    combined.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
    const filtered = combined.filter(user => user.daysUntilBirthday <= 45);
    return filtered;
}

export function useUpcomingBirthdays() {
    // Use SWR with a refreshInterval of 60 seconds (60000ms)
    const { data, error } = useSWR('upcomingBirthdays', fetchUpcomingBirthdays, {
        refreshInterval: 60000,
        revalidateOnFocus: true,
    });
    return {
        upcomingBirthdays: data || [],
        isLoading: !data && !error,
        error,
    };
}

export function useGetAllUsers() {
    return useSWR('all_users', async () => {
        const { data, error } = await supabase
            .from('user_info') // or 'auth.users' if that’s where you store user data
            .select('id, full_name, email, avatar_url');

        if (error) throw error;
        return data; // e.g. [{id, full_name, email, avatar_url}, ...]
    });
}