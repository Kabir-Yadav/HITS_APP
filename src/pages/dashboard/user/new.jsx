import { Helmet } from 'react-helmet-async';

import UserCreateView from 'src/sections/user/view/user-create-view';

// ----------------------------------------------------------------------

export default function UserCreatePage() {
  return (
    <>
      <Helmet>
        <title> User: Create New User</title>
      </Helmet>

      <UserCreateView />
    </>
  );
}
