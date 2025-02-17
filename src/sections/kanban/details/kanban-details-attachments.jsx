import { useState, useCallback } from 'react';

import { supabase } from 'src/lib/supabase';

import { UploadBox, MultiFilePreview } from 'src/components/upload';

// ----------------------------------------------------------------------

export function KanbanDetailsAttachments({ taskId, attachments = [] }) {
  const [files, setFiles] = useState(attachments);

  const handleDrop = useCallback(
    async (acceptedFiles) => {
      const newFiles = [];
      
      for (const file of acceptedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${taskId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(filePath);

          const { data, error } = await supabase
            .from('kanban_task_attachments')
            .insert([{
              task_id: taskId,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: supabase.auth.user()?.id
            }])
            .select()
            .single();

          if (!error) {
            newFiles.push({
              ...data,
              preview: publicUrl
            });
          }
        }
      }

      setFiles([...files, ...newFiles]);
    },
    [files, taskId]
  );

  const handleRemoveFile = useCallback(
    async (fileToRemove) => {
      const { error: deleteError } = await supabase.storage
        .from('task-attachments')
        .remove([fileToRemove.file_path]);

      if (!deleteError) {
        await supabase
          .from('kanban_task_attachments')
          .delete()
          .eq('id', fileToRemove.id);

        const filtered = files.filter((file) => file.id !== fileToRemove.id);
        setFiles(filtered);
      }
    },
    [files]
  );

  return (
    <MultiFilePreview
      thumbnail
      files={files}
      onRemove={handleRemoveFile}
      slotProps={{ thumbnail: { sx: { width: 64, height: 64 } } }}
      lastNode={<UploadBox onDrop={handleDrop} />}
    />
  );
}
