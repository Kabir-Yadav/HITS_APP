import { forwardRef } from 'react';
import { mergeClasses } from 'minimal-shared/utils';

import Link from '@mui/material/Link';
import { styled } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export const Logo = forwardRef((props, ref) => {
  const { className, href = '/', isSingle = true, disabled, sx, ...other } = props;

  const logo = (
    <img
      src="/assets/employeeos-logo.png" // Assuming the image is in the public directory
      alt="EmployeeOS"
      width="100%"
      height="100%"
      style={{
        objectFit: 'contain',
        maxHeight: 60, // Adjust this value based on your needs
      }}
    />
  );

  const component = disabled ? 'span' : RouterLink;

  return (
    <LogoRoot
      ref={ref}
      component={component}
      href={href}
      className={mergeClasses(logoClasses.root, className)}
      sx={sx}
      {...other}
    >
      {logo}
    </LogoRoot>
  );
});

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(() => ({
  flexShrink: 0,
  display: 'inline-flex',
  verticalAlign: 'middle',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
}));
