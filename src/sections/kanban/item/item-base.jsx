import { memo, useEffect, forwardRef } from 'react';
import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { imageClasses } from 'src/components/image';

import { kanbanClasses } from '../classes';

// ----------------------------------------------------------------------

const ItemBase = forwardRef((props, ref) => {
  const { task, open, onClick, stateProps, sx, ...other } = props;

  const { fadeIn, sorting, disabled, dragging, dragOverlay, transition, transform, listeners } =
    stateProps ?? {};

  useEffect(() => {
    if (!dragOverlay) {
      return undefined;
    }

    document.body.style.cursor = 'grabbing';
    return () => {
      document.body.style.cursor = '';
    };
  }, [dragOverlay]);

  const renderPriority = () => (
    <Iconify
      icon={
        (task.priority === 'low' && 'solar:double-alt-arrow-down-bold-duotone') ||
        (task.priority === 'medium' && 'solar:double-alt-arrow-right-bold-duotone') ||
        'solar:double-alt-arrow-up-bold-duotone'
      }
      sx={{
        top: 4,
        right: 4,
        position: 'absolute',
        ...(task.priority === 'low' && { color: 'info.main' }),
        ...(task.priority === 'medium' && { color: 'warning.main' }),
        ...(task.priority === 'high' && { color: 'error.main' }),
      }}
    />
  );

  const renderImage = () => {
    if (!task?.attachments?.length) return null;
    
    return (
      <Box sx={[(theme) => ({ p: theme.spacing(1, 1, 0, 1) })]}>
        <ItemImage
          open={open}
          className={imageClasses.root}
          alt={task?.attachments?.[0]}
          src={task?.attachments?.[0]}
        />
      </Box>
    );
  };

  const renderInfo = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          typography: 'caption',
          color: 'text.disabled',
        }}
      >
        {!!task?.attachments?.length && (
          <>
            <Iconify width={16} icon="eva:attach-2-fill" sx={{ mr: 0.25 }} />
            <Box component="span">{task?.attachments?.length}</Box>
          </>
        )}
      </Box>
    </Box>
  );

  return (
    <ItemWrap
      ref={ref}
      className={mergeClasses([kanbanClasses.itemWrap], {
        [kanbanClasses.state.fadeIn]: fadeIn,
        [kanbanClasses.state.dragOverlay]: dragOverlay,
      })}
      style={{
        transition,
        ...(transform && {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`,
        }),
      }}
    >
      <ItemRoot
        className={mergeClasses([kanbanClasses.item], {
          [kanbanClasses.state.fadeIn]: fadeIn,
          [kanbanClasses.state.sorting]: sorting,
          [kanbanClasses.state.dragging]: dragging,
          [kanbanClasses.state.disabled]: disabled,
          [kanbanClasses.state.dragOverlay]: dragOverlay,
        })}
        data-cypress="draggable-item"
        tabIndex={0}
        onClick={onClick}
        sx={sx}
        {...listeners}
        {...other}
      >
        {renderImage()}
        <ItemContent>
          {renderPriority()}
          {task.name}
          {renderInfo()}
        </ItemContent>
      </ItemRoot>
    </ItemWrap>
  );
});

export default memo(ItemBase);

// ----------------------------------------------------------------------

const ItemWrap = styled('div')(() => ({
  position: 'relative',
  '&.fadeIn': {
    transition: 'opacity 500ms ease',
  },
}));

const ItemRoot = styled('div')(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.background.neutral,
  },
  '&.dragging': {
    opacity: 0.2,
    filter: 'grayscale(1)',
  },
}));

const ItemContent = styled('div')(({ theme }) => ({
  ...theme.typography.subtitle2,
  position: 'relative',
  padding: theme.spacing(2.5, 2),
}));

const ItemImage = styled('img', {
  shouldForwardProp: (prop) => !['open'].includes(prop),
})(({ theme }) => ({
  width: '100%',
  height: 'auto',
  aspectRatio: '4/3',
  objectFit: 'cover',
  borderRadius: theme.shape.borderRadius,
  opacity: (props) => (props.open ? 0.8 : 1),
}));
