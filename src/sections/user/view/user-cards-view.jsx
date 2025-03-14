import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';

import { supabase } from 'src/lib/supabase';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { UserCardList } from '../user-card-list';

// ----------------------------------------------------------------------
async function fetchUsers() {
  const { data, error } = await supabase
    .from('user_info')
    .select('*')

  if (error) throw error;
  return data;
}

export function UserCardsView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUsers() {
      try {
        const userData = await fetchUsers();
        setUsers(userData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }
    getUsers();
  }, []);

  if (loading) return <p>Loading users...</p>;
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="User cards"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'User', href: paths.dashboard.user.root },
          { name: 'Cards' },
        ]}

        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <UserCardList users={users} />
    </DashboardContent>
  );
}
