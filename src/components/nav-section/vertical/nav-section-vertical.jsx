import { memo } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { mergeClasses } from 'minimal-shared/utils';

import Collapse from '@mui/material/Collapse';
import { useTheme } from '@mui/material/styles';

import { usePathname } from 'src/routes/hooks';

import { useNavData } from 'src/layouts/nav-config-dashboard-wrapper';

import { NavList } from './nav-list';
import { Nav, NavUl, NavLi, NavSubheader } from '../components';
import { navSectionClasses, navSectionCssVars } from '../styles';

// ----------------------------------------------------------------------

export function NavSectionVertical({
  sx,
  data,
  render,
  className,
  slotProps,
  currentRole,
  enabledRootRedirect,
  cssVars: overridesVars,
  ...other
}) {
  const theme = useTheme();
  const pathname = usePathname();
  
  // Use dynamic nav data if no data is provided
  const dynamicData = useNavData();
  const navData = data.length ? data : dynamicData;

  const cssVars = { ...navSectionCssVars.vertical(theme), ...overridesVars };

  return (
    <Nav
      className={mergeClasses([navSectionClasses.vertical, className])}
      sx={[{ ...cssVars }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    >
      <NavUl sx={{ flex: '1 1 auto', gap: 'var(--nav-item-gap)' }}>
        {navData.map((group, index) => (
          <Group
            key={group.subheader || index}
            subheader={group.subheader}
            items={group.items}
            render={render}
            slotProps={slotProps}
            currentRole={currentRole}
            enabledRootRedirect={enabledRootRedirect}
            pathname={pathname}
          />
        ))}
      </NavUl>
    </Nav>
  );
}

export default memo(NavSectionVertical);

// ----------------------------------------------------------------------

function Group({ items, render, subheader, slotProps, currentRole, enabledRootRedirect, pathname }) {
  const groupOpen = useBoolean(true);

  const renderContent = () => (
    <NavUl sx={{ gap: 'var(--nav-item-gap)' }}>
      {items.map((list) => (
        <NavList
          key={list.title}
          data={list}
          render={render}
          depth={1}
          slotProps={slotProps}
          currentRole={currentRole}
          enabledRootRedirect={enabledRootRedirect}
          pathname={pathname}
        />
      ))}
    </NavUl>
  );

  return (
    <NavLi>
      {subheader ? (
        <>
          <NavSubheader
            data-title={subheader}
            open={groupOpen.value}
            onClick={groupOpen.onToggle}
            sx={slotProps?.subheader}
          >
            {subheader}
          </NavSubheader>

          <Collapse in={groupOpen.value}>{renderContent()}</Collapse>
        </>
      ) : (
        renderContent()
      )}
    </NavLi>
  );
}
