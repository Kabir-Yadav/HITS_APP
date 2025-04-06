import { useState, useCallback, useEffect } from 'react';
import { useBoolean, usePopover, useCopyToClipboard } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import AvatarGroup, { avatarGroupClasses } from '@mui/material/AvatarGroup';

import { fData } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';
import { getFolderContents, toggleFavorite } from 'src/actions/filemanager';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';
import { FileThumbnail } from 'src/components/file-thumbnail';

import { FileManagerShareDialog } from './file-manager-share-dialog';
import { FileManagerFileDetails } from './file-manager-file-details';
import { FileManagerNewFolderDialog } from './file-manager-new-folder-dialog';

// ----------------------------------------------------------------------

export function FileManagerFolderItem({ sx, folder, userId, isFolder = true, selected, onSelect, onDelete, ...other }) {
  const shareDialog = useBoolean();
  const confirmDialog = useBoolean();
  const detailsDrawer = useBoolean();
  const editFolderDialog = useBoolean();

  const checkbox = useBoolean();
  const favorite = folder.isFavorited;

  const menuActions = usePopover();

  const { copy } = useCopyToClipboard();

  const [inviteEmail, setInviteEmail] = useState('');
  const [folderName, setFolderName] = useState(folder.name);

  const handleChangeInvite = useCallback((event) => {
    setInviteEmail(event.target.value);
  }, []);

  const handleChangeFolderName = useCallback((event) => {
    setFolderName(event.target.value);
  }, []);

  const handleCopy = useCallback(() => {
    toast.success('Copied!');
    copy(folder.url);
  }, [copy, folder.url]);

  const handleToggleFavorite = async (fileId, currentValue, isActualFolder) => {
    const result = await toggleFavorite(fileId, userId, currentValue, isActualFolder);
    if (!result.success) {
      toast.error('Failed to toggle favorite');
    }
  };
  const renderActions = () => (
    <Box
      sx={{
        top: 8,
        right: 8,
        display: 'flex',
        position: 'absolute',
        alignItems: 'center',
      }}
    >
      <Checkbox
        color="warning"
        icon={<Iconify icon="eva:star-outline" />}
        checkedIcon={<Iconify icon="eva:star-fill" />}
        checked={favorite}
        onChange={() => handleToggleFavorite(folder.id, favorite, folder.type === 'folder')}
        inputProps={{
          id: `favorite-${folder.id}-checkbox`,
          'aria-label': `Favorite ${folder.id} checkbox`,
        }}
      />

      <IconButton color={menuActions.open ? 'inherit' : 'default'} onClick={menuActions.onOpen}>
        <Iconify icon="eva:more-vertical-fill" />
      </IconButton>
    </Box>
  );

  const renderIcon = () => (
    <Box
      onMouseEnter={checkbox.onTrue}
      onMouseLeave={checkbox.onFalse}
      sx={{ width: 36, height: 36 }}
    >
      {(checkbox.value || selected) && onSelect ? (
        <Checkbox
          checked={selected}
          onClick={onSelect}
          icon={<Iconify icon="eva:radio-button-off-fill" />}
          checkedIcon={<Iconify icon="eva:checkmark-circle-2-fill" />}
          sx={{ width: 1, height: 1 }}
        />
      ) : isFolder ? (
        <Box
          component="img"
          src={`${CONFIG.assetsDir}/assets/icons/files/ic-folder.svg`}
          sx={{ width: 1, height: 1 }}
        />
      ) : <FileThumbnail file={folder.type} />

      }
    </Box>
  );
  const renderText = () => (
    <ListItemText
      onClick={detailsDrawer.onTrue}
      primary={folder.name}
      secondary={
        <>
          {fData(folder.size)}
          {isFolder && (<Box
            component="span"
            sx={{
              mx: 0.75,
              width: 2,
              height: 2,
              borderRadius: '50%',
              bgcolor: 'currentColor',
            }}
          />)}
          {isFolder && `${folder.totalFiles} files`}
        </>
      }
      slotProps={{
        primary: { noWrap: false, maxWidth: 300, minWidth: 200, sx: { typography: 'subtitle1' } },
        secondary: {
          sx: {
            mt: 0.5,
            alignItems: 'center',
            typography: 'caption',
            color: 'text.disabled',
            display: 'inline-flex',
          },
        },
      }}
    />
  );

  const renderAvatar = () => (
    <AvatarGroup
      max={3}
      sx={{
        [`& .${avatarGroupClasses.avatar}`]: {
          width: 24,
          height: 24,
          '&:first-of-type': { fontSize: 12 },
        },
      }}
    >
      {folder.shared?.map((person) => (
        <Avatar key={person.id} alt={person.name} src={person.avatarUrl} />
      ))}
    </AvatarGroup>
  );

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <MenuItem
          onClick={() => {
            menuActions.onClose();
            handleCopy();
          }}
        >
          <Iconify icon="eva:link-2-fill" />
          Copy Link
        </MenuItem>

        <MenuItem
          onClick={() => {
            menuActions.onClose();
            shareDialog.onTrue();
          }}
        >
          <Iconify icon="solar:share-bold" />
          Share
        </MenuItem>

        {isFolder && (<MenuItem
          onClick={() => {
            menuActions.onClose();
            editFolderDialog.onTrue();
          }}
        >
          <Iconify icon="solar:pen-bold" />
          Edit
        </MenuItem>)}

        {folder.accessType === 'owner' && (<Divider sx={{ borderStyle: 'dashed' }} />)}

        {folder.accessType === 'owner' && (<MenuItem
          onClick={() => {
            confirmDialog.onTrue();
            menuActions.onClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>)}
      </MenuList>
    </CustomPopover>
  );

  const renderFileDetailsDrawer = () => (
    <FileManagerFileDetails
      userId={userId}
      file={folder}
      favorited={favorite}
      onFavorite={() => handleToggleFavorite(folder.id, favorite, folder.type === 'folder')}
      onCopyLink={handleCopy}
      open={detailsDrawer.value}
      onClose={detailsDrawer.onFalse}
      onDelete={() => {
        detailsDrawer.onFalse();
        onDelete();
      }}
    />
  );

  const renderShareDialog = () => (
    <FileManagerShareDialog
      ownerId={userId}
      fileId={folder.id}
      open={shareDialog.value}
      shared={folder.shared}
      inviteEmail={inviteEmail}
      onChangeInvite={handleChangeInvite}
      onCopyLink={handleCopy}
      onClose={() => {
        shareDialog.onFalse();
        setInviteEmail('');
      }}
    />
  );
  const [folderContent, setFolderContent] = useState([])
  const fetchData = async () => {
    console.log("fetching again");
    if (isFolder) {
      try {
        const data = await getFolderContents(userId, folder.id);
        console.log("data", data);
        if (data?.data) {
          const fc = data.data
            .filter((f) => f.id !== folder.id) // Exclude entry with the same folder.id
            .map((f) => ({
              id: f.id,
              file_name: f.name,
              file_size: f.size,
              file_type: f.type,
            }));
          setFolderContent(fc);
        }
      } catch (error) {
        console.error('Error fetching folder contents:', error);
      }
    }
  };

  // Call fetchData when the component mounts and when folderId, userId, or isFolder changes
  useEffect(() => {
    fetchData();
  }, [folder.id, userId, isFolder]);


  const renderEditFolderDialog = () => (
    <FileManagerNewFolderDialog
      open={editFolderDialog.value}
      onClose={() => {
        editFolderDialog.onFalse();
        fetchData()
      }}
      title="Edit Folder"
      folderId={folder.id}
      userId={userId}
      onUpdate={() => {
        editFolderDialog.onFalse();
        setFolderName(folderName);
        console.info('UPDATE FOLDER', folderName);
        fetchData()
      }}
      folderName={folderName}
      onChangeFolderName={handleChangeFolderName}
      selectedfiles={folderContent}
    />
  );

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content="Are you sure want to delete?"
      action={
        <Button variant="contained" color="error" onClick={onDelete}>
          Delete
        </Button>
      }
    />
  );

  return (
    <>
      <Paper
        variant="outlined"
        sx={[
          (theme) => ({
            gap: 1,
            p: 2.5,
            display: 'flex',
            borderRadius: 2,
            cursor: 'pointer',
            position: 'relative',
            bgcolor: 'transparent',
            flexDirection: 'column',
            alignItems: 'flex-start',
            ...((checkbox.value || selected) && {
              bgcolor: 'background.paper',
              boxShadow: theme.vars.customShadows.z20,
            }),
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        {renderIcon()}
        {renderActions()}
        {renderText()}
        {!!folder?.shared?.length && renderAvatar()}
      </Paper>

      {renderShareDialog()}
      {renderEditFolderDialog()}
      {renderFileDetailsDrawer()}

      {renderMenuActions()}
      {renderConfirmDialog()}
    </>
  );
}
