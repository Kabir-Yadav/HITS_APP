import { useState, useCallback } from 'react';

import { supabase } from 'src/lib/supabase';

import { UploadBox, MultiFilePreview } from 'src/components/upload';

// ----------------------------------------------------------------------

export function KanbanDetailsAttachments({ taskId, attachments }) {
  const [files, setFiles] = useState(attachments);

  const handleDrop = useCallback(
    async (acceptedFiles) => {
      try {
        const newFiles = [];
        
        for (const file of acceptedFiles) {
          const fileName = `${taskId}/${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('kanban-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('kanban-attachments')
            .getPublicUrl(fileName);

          await supabase
            .from('kanban_task_attachments')
            .insert([{
              task_id: taskId,
              file_name: file.name,
              file_url: publicUrl,
            }]);

          newFiles.push(publicUrl);
        }

        setFiles([...files, ...newFiles]);
      } catch (error) {
        console.error('Error uploading files:', error);
      }
    },
    [files, taskId]
  );

  const handleRemoveFile = useCallback(
    async (fileUrl) => {
      try {
        const fileName = fileUrl.split('/').pop();
        
        await supabase.storage
          .from('kanban-attachments')
          .remove([`${taskId}/${fileName}`]);

        await supabase
          .from('kanban_task_attachments')
          .delete()
          .eq('task_id', taskId)
          .eq('file_url', fileUrl);

        const filtered = files.filter((file) => file !== fileUrl);
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
      files={files}
      onRemove={(file) => handleRemoveFile(file)}
      slotProps={{ thumbnail: { sx: { width: 64, height: 64 } } }}
      lastNode={<UploadBox onDrop={handleDrop} />}
    />
  );
}
