import { useState, useCallback } from 'react';

import { supabase } from 'src/lib/supabase';

import { UploadBox, MultiFilePreview } from 'src/components/upload';

// ----------------------------------------------------------------------

export function KanbanDetailsAttachments({ taskId, attachments = [] }) {
  const [files, setFiles] = useState(attachments);

  const handleDrop = useCallback(
    async (acceptedFiles) => {
      try {
        const newAttachments = await Promise.all(
          acceptedFiles.map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${taskId}/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('task-attachments')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('task-attachments')
              .getPublicUrl(filePath);

            // Save attachment record
            const { data, error } = await supabase
              .from('task_attachments')
              .insert({
                task_id: taskId,
                file_name: file.name,
                file_url: publicUrl,
                file_type: file.type,
                file_size: file.size
              })
              .select()
              .single();

            if (error) throw error;

            return data;
          })
        );

        setFiles([...files, ...newAttachments]);
      } catch (error) {
        console.error('Error uploading files:', error);
      }
    },
    [files, taskId]
  );

  const handleRemoveFile = useCallback(
    async (fileToRemove) => {
      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('task-attachments')
          .remove([`${taskId}/${fileToRemove.file_name}`]);

        if (storageError) throw storageError;

        // Delete record
        const { error: dbError } = await supabase
          .from('task_attachments')
          .delete()
          .eq('id', fileToRemove.id);

        if (dbError) throw dbError;

        const filtered = files.filter((file) => file.id !== fileToRemove.id);
        setFiles(filtered);
      } catch (error) {
        console.error('Error removing file:', error);
      }
    },
    [files, taskId]
  );

  return (
    <MultiFilePreview
      thumbnail
      files={files.map(file => ({
        ...file,
        preview: file.file_url
      }))}
      onRemove={handleRemoveFile}
      slotProps={{ thumbnail: { sx: { width: 64, height: 64 } } }}
      lastNode={<UploadBox onDrop={handleDrop} />}
    />
  );
}
