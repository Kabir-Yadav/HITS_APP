import { useMemo } from 'react';
import { keyBy } from 'es-toolkit';
import useSWR, { mutate } from 'swr';

import { supabase } from 'src/lib/supabase';
import axios, { fetcher, endpoints } from 'src/lib/axios';

const enableServer = false;

const swrOptions = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: enableServer,
  revalidateOnReconnect: enableServer,
};

// export default function useGetFiles(user_id) {
//   const { data, isLoading, error, isValidating } = useSWR(`${BASE_URL}?user_id=${user_id}`, fetcher, swrOptions);

//   return {
//     data: data || [], // ✅ Ensure `data` is always an array
//     isLoading,
//     isError: error,
//   };
// }

// export async function uploadFiles(user_id, files, folder_name = null) {
//   try {
//     const payload = {
//       user_id,
//       files,
//       folder_name,
//     };

//     // Send the request
//     await axios.post(`${BASE_URL}/upload`, payload);

//     // ✅ Refresh files list after successful upload
//     mutate(`${BASE_URL}?user_id=${user_id}`);

//     return { success: true };
//   } catch (error) {
//     console.error('Error uploading files:', error);
//     return { success: false, error };
//   }
// }

// export async function deleteFiles(user_id, fileIds,) {
//   try {
//     if (!fileIds.length) {
//       throw new Error('No files selected for deletion.');
//     }

//     // Perform API delete requests for each file
//     await Promise.all(
//       fileIds.map((fileId) =>
//         axios.delete(`${BASE_URL}/${fileId}`, {
//           data: { user_id }, // Backend expects user_id in request body
//         })
//       )
//     );

//     // ✅ Refresh file list after deletion
//     mutate(`${BASE_URL}?user_id=${user_id}`);


//     return { success: true };
//   } catch (error) {
//     console.error('Error deleting files:', error);
//     return { success: false, error };
//   }
// }

// Helper: Format file size from bytes to a human‐readable string.
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

// ----------------------------------------------------------------------------
// This hook fetches both files and folders from Supabase, then formats them
// to match the structure of your mock data used in the File Manager view.
export default function useGetFiles(user_id) {
  const { data, error, isLoading } = useSWR(
    ['get_files', user_id],
    async () => {
      // 1. Query files for the user
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('id, file_name, file_size, file_type, storage_url, created_at, is_favorite')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      // 2. Query folders for the user
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('id, folder_name, created_at')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (foldersError) throw foldersError;

      // 3. Map files to match your mock structure:
      //    - id, name, url, type, size, createdAt, modifiedAt, isFavorited, shared
      const files = filesData.map((file) => ({
        id: file.id,
        name: file.file_name,
        url: file.storage_url,
        type: file.file_type,
        size: formatFileSize(file.file_size),
        createdAt: file.created_at,
        modifiedAt: file.created_at, // Adjust if you store a separate modifiedAt
        isFavorited: file.is_favorite,
        shared: [] // Extend as needed (for now, empty array)
      }));

      // 4. Map folders to match your mock structure:
      //    - id, name, url (could be an icon URL), type: 'folder', size: null, totalFiles, createdAt, modifiedAt, isFavorited, shared
      const folders = foldersData.map((folder) => ({
        id: folder.id,
        name: folder.folder_name,
        url: '', // For folders you might show an icon instead
        type: 'folder',
        size: null,
        totalFiles: 0, // Adjust if you wish to compute the number of files in the folder
        createdAt: folder.created_at,
        modifiedAt: folder.created_at,
        isFavorited: false,
        shared: [] // Extend as needed
      }));

      // 5. Combine folders and files into one array.
      return [...folders, ...files];
    }
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
  };
}

// ----------------------------------------------------------------------------
// Upload files using Supabase Storage and then insert metadata into the database.
// The function expects each file to have a structure similar to the mock (with fields like file_base64, file_name, etc.)
// If a folder name is provided, it will be used in the database record (but storage remains flat in this example).
export async function uploadFiles(user_id, files, folder_name = null) {
  try {
    for (const file of files) {
      // In this example, we store everything in a flat bucket.
      // Adjust the path if you want to mimic folder hierarchy.
      const filePath = file.file_name; // You can prepend folder_name if needed: `${folder_name}/${file.file_name}`

      // Upload file to Supabase Storage (bucket: "file_attachments")
      const { data: storageData, error: storageError } = await supabase.storage
        .from('file_attachments')
        .upload(filePath, file.file_base64, {
          cacheControl: '3600',
          upsert: true,
        });
      if (storageError) throw storageError;

      // Insert file record into the "files" table
      const { error: dbError } = await supabase.from('files').insert([
        {
          user_id,
          file_name: file.file_name,
          file_size: file.file_size,
          file_type: file.file_type,
          storage_url: storageData.path,
          is_favorite: false,
          // Optionally, store folder_name (if provided) for organizational purposes
        }
      ]);
      if (dbError) throw dbError;
    }

    // Refresh the SWR cache for get_files
    mutate(['get_files', user_id]);

    return { success: true };
  } catch (error) {
    console.error('Error uploading files:', error);
    return { success: false, error };
  }
}

// ----------------------------------------------------------------------------
// Delete files using Supabase Storage and remove metadata from the database.
// This function loops through fileIds, removes the file from storage, then deletes the record.
export async function deleteFiles(user_id, fileIds) {
  try {
    if (!fileIds.length) throw new Error('No files selected for deletion.');

    for (const fileId of fileIds) {
      // First, get the file record from the database (to know its storage_url)
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('storage_url')
        .eq('id', fileId)
        .single();
      if (fileError) throw fileError;

      // Delete the file from Supabase Storage
      const { error: removeError } = await supabase.storage
        .from('file_attachments')
        .remove([fileData.storage_url]);
      if (removeError) throw removeError;

      // Delete the file record from the "files" table
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user_id);
      if (dbError) throw dbError;
    }

    mutate(['get_files', user_id]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting files:', error);
    return { success: false, error };
  }
}