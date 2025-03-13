import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { UploadBox, MultiFilePreview } from 'src/components/upload';

// ----------------------------------------------------------------------

export function KanbanDetailsAttachments({ taskId, attachments = [] }) {
  const [files, setFiles] = useState(attachments);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const loading = useBoolean();

  const handleDrop = useCallback(
    async (acceptedFiles) => {
      if (!taskId) {
        console.error('TaskId is required for file upload');
        return;
      }

      try {
        loading.onTrue();
        const newFiles = [];

        for (const file of acceptedFiles) {
          // Create a unique file name to prevent collisions
          const fileExt = file.name.split('.').pop();
          const fileName = `${taskId}/${Date.now()}.${fileExt}`;
          console.log(file)
          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from('kanban-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('kanban-attachments')
            .getPublicUrl(fileName);

          // Save attachment record in database
          const { data: attachment, error: dbError } = await supabase
            .from('kanban_task_attachments')
            .insert({
              task_id: taskId,
              file_name: file.name,
              file_url: publicUrl,
              file_type: file.type,
              file_size: file.size,
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error:', dbError);
            throw dbError;
          }

          newFiles.push(attachment);
        }

        setFiles([...files, ...newFiles]);
      } catch (error) {
        console.error('Error uploading files:', error);
      } finally {
        loading.onFalse();
      }
    },
    [files, taskId, loading]
  );

  const handleRemoveFile = useCallback(
    async (fileUrl) => {
      try {
        loading.onTrue();

        // Get the attachment record
        const { data: attachment } = await supabase
          .from('kanban_task_attachments')
          .select('*')
          .eq('file_url', fileUrl)
          .single();

        if (!attachment) return;

        // Delete from storage
        const fileName = fileUrl.split('/').pop();
        const { error: storageError } = await supabase.storage
          .from('kanban-attachments')
          .remove([`${taskId}/${fileName}`]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabase
          .from('kanban_task_attachments')
          .delete()
          .eq('id', attachment.id);

        if (dbError) throw dbError;

        // Update local state
        setFiles(files.filter(file => file.file_url !== fileUrl));
      } catch (error) {
        console.error('Error removing file:', error);
      } finally {
        loading.onFalse();
      }
    },
    [files, taskId, loading]
  );

  const handleOpenConfirm = (file) => {
    setFileToDelete(file);
    setOpenConfirm(true);
  };

  const handleCloseConfirm = () => {
    setFileToDelete(null);
    setOpenConfirm(false);
  };

  return (
    <>
      <Stack spacing={2}>
        {files.length > 0 && (
          <Stack spacing={1}>
            {files.map((file) => (
              <Box
                key={file.id}
                sx={{
                  position: 'relative',
                  width: '100%',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  boxShadow: (theme) => theme.customShadows.z8,
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.customShadows.z24,
                    '& .delete-button': {
                      opacity: 1,
                    },
                  },
                }}
              >
                <Box
                  component="img"
                  src={file.file_url}
                  alt={file.file_name}
                  sx={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover',
                  }}
                />

                <Box
                  sx={{
                    p: 1,
                    width: '100%',
                    bottom: 0,
                    position: 'absolute',
                    bgcolor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(3px)',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'common.white' }}>
                    {file.file_name}
                  </Typography>
                </Box>

                <IconButton
                  className="delete-button"
                  size="small"
                  onClick={() => handleOpenConfirm(file)}
                  sx={{
                    top: 8,
                    right: 8,
                    position: 'absolute',
                    color: 'common.white',
                    bgcolor: 'rgba(0,0,0,0.4)',
                    opacity: 0,
                    transition: 'opacity 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.6)',
                    },
                  }}
                >
                  <Iconify icon="mingcute:delete-line" width={18} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}

        <UploadBox
          disabled={loading.value}
          onDrop={handleDrop}
          sx={{
            width: '100%',
            height: 'auto',
            py: 2.5,
            mb: 2,
            borderRadius: 1.5,
            bgcolor: (theme) => theme.palette.background.neutral,
            transition: (theme) =>
              theme.transitions.create(['border', 'background-color'], {
                duration: theme.transitions.duration.shorter,
              }),
            '&:hover': {
              bgcolor: (theme) => theme.palette.action.hover,
            },
            ...(loading.value && {
              opacity: 0.48,
              pointerEvents: 'none',
            }),
          }}
          placeholder={
            <Stack spacing={0.5} alignItems="center">
              <Box
                sx={{
                  p: 2.5,
                  mb: 1,
                  borderRadius: '50%',
                  bgcolor: (theme) => theme.palette.background.paper,
                  boxShadow: (theme) => theme.customShadows.z8,
                }}
              >
                <Iconify
                  icon="eva:cloud-upload-fill"
                  width={40}
                  sx={{
                    color: (theme) => theme.palette.primary.main,
                  }}
                />
              </Box>
              <Typography variant="h6">Drop files here or click to browse</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Drag and drop or click to select files
              </Typography>
            </Stack>
          }
        />
      </Stack>

      <ConfirmDialog
        open={openConfirm}
        onClose={handleCloseConfirm}
        title="Delete Attachment"
        content="Are you sure you want to delete this attachment? This action cannot be undone."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              handleRemoveFile(fileToDelete?.file_url);
              handleCloseConfirm();
            }}
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}
