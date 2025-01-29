import React from 'react';
import { ChevronLeft } from 'lucide-react';

import { useTheme } from '@mui/material/styles';

const BackLink = () => {
  const theme = useTheme();

  return (
    <a
      href="http://localhost/hrms-f13_dev/dashboard_hr.php"
      className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 dark:border-gray-700 dark:hover:bg-gray-800"
      style={{
        color: 'var(--layout-nav-text-secondary-color)',
        textDecoration: 'none',
      }}
    >
      <ChevronLeft size={16} className="relative top-[0.5px]" />
      Back to main Doc
    </a>
  );
};

export default BackLink;
