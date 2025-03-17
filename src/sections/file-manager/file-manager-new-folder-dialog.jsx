import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { createFolder, removeFilesFromFolder, updateFolderName, uploadFiles } from 'src/actions/filemanager';

import { Upload } from 'src/components/upload';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
// ----------------------------------------------------------------------

export function FileManagerNewFolderDialog({
  open,
  onClose,
  onCreate,
  onUpdate,
  folderName,
  onChangeFolderName,
  title = 'Upload files',
  isCreatingFolder = false,
  selectedfiles = [],
  folderId,
  userId, // Pass userId as a prop
  refreshFiles, // Function to refresh file list after upload
  ...other
}) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (open) {
      setFiles([...selectedfiles]);
    }
  }, [open, JSON.stringify(selectedfiles)]);

  const handleDrop = useCallback(
    (acceptedFiles) => {
      const readFiles = acceptedFiles.map((file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () =>
            resolve({
              file_base64: reader.result, // Keep the full Base64 string
              file_name: file.name,
              file_size: file.size, // Size in bytes
              file_type: file.name.split('.').pop().toLowerCase(), // Extract file extension
            });

        })
      );

      Promise.all(readFiles).then((uploadedFiles) => setFiles([...files, ...uploadedFiles]));
    },
    [files]
  );


  const handleUpload = async () => {
    if (!userId) {
      toast.error('User ID is missing');
      return;
    }

    if (files.length === 0) {
      toast.error('No files selected');
      return;
    }

    try {
      const result = await uploadFiles(userId, files, folderName || null);

      if (result.success) {
        toast.success('Files uploaded successfully!');
        onClose();
      } else {
        throw new Error('Upload failed.');
      }
    } catch (error) {
      toast.error('Error uploading files.');
      console.error(error);
    }
  };


  const handleRemoveFile = (inputFile) => {
    const filtered = files.filter((file) => file !== inputFile);
    setFiles(filtered);
  };

  const handleRemoveAllFiles = () => {
    setFiles([]);
  };
  const handleFolderChanges = async () => {
    if (!userId || !folderId) {
      toast.error('User ID or Folder ID is missing');
      return;
    }

    try {
      // 1) **Update Folder Name** if changed
      if (onChangeFolderName && folderName) {
        await updateFolderName(userId, folderId, folderName);
      }

      // 2) **Upload new files** if any
      const newFiles = files.filter((file) => !file.id); // Identify new files (those without an ID)
      if (newFiles.length > 0) {
        await uploadFiles(userId, newFiles, null, folderId);
      }

      // 3) **Remove files from folder** if deleted
      const existingFileIds = selectedfiles.map((f) => f.id);
      const removedFileIds = existingFileIds.filter(
        (id) => !files.some((file) => file.id === id)
      );

      if (removedFileIds.length > 0) {
        await removeFilesFromFolder(userId, folderId, removedFileIds);
      }

      toast.success('Folder updated successfully!');
      onClose();
    } catch (error) {
      toast.error('Error updating folder.');
      console.error(error);
    }
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose} {...other}>
      <DialogTitle sx={[(theme) => ({ p: theme.spacing(3, 3, 2, 3) })]}>{title}</DialogTitle>

      <DialogContent dividers sx={{ pt: 1, pb: 0, border: 'none' }}>
        {(onCreate || onUpdate) && (
          <TextField
            fullWidth
            label="Folder name"
            value={folderName}
            onChange={onChangeFolderName}
            sx={{ mb: 3 }}
          />
        )}

        <Upload isCreatingFolder={isCreatingFolder} multiple value={files} onDrop={handleDrop} onRemove={handleRemoveFile} />
      </DialogContent>

      <DialogActions>
        {!isCreatingFolder && (<Button
          variant="contained"
          startIcon={<Iconify icon="eva:cloud-upload-fill" />}
          onClick={handleUpload}
        >
          Upload
        </Button>)}

        {!!files.length && (
          <Button variant="outlined" color="inherit" onClick={handleRemoveAllFiles}>
            Remove all
          </Button>
        )}

        {(onCreate) && (
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="soft" onClick={onCreate}>
              Create
            </Button>
          </Box>
        )}
        {(onUpdate) && (
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="soft" onClick={handleFolderChanges}>
              Save
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
