import { useEffect } from 'react';
import useSWR, { mutate } from 'swr';

import { supabase } from 'src/lib/supabase';

export function useGetAllUsers() {
  return useSWR('all_users', async () => {
    const { data, error } = await supabase
      .from('user_info') // or 'auth.users' if that’s where you store user data
      .select('id, full_name, email, avatar_url');

    if (error) throw error;
    return data; // e.g. [{id, full_name, email, avatar_url}, ...]
  });
}
// ----------------------------------------------------------------------------
// This hook fetches both files and folders from Supabase, then formats them
// to match the structure of your mock data used in the File Manager view.
async function fetchUsersByIds(userIds) {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('user_info') // Ensure this table exists
    .select('id, full_name, email, avatar_url')
    .in('id', userIds);

  if (error) throw error;
  return data;
}

export default function useGetFiles(user_id) {
  const { data, error, isLoading } = useSWR(
    ['get_files', user_id],
    async () => {
      // 1) Fetch owned files
      const { data: ownedFiles, error: ownedFilesError } = await supabase
        .from('files')
        .select('id, user_id, file_name, file_size, file_type, storage_url, created_at, is_favorite')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (ownedFilesError) throw ownedFilesError;

      // 2) Fetch shared files (files shared **with** the user)
      const { data: sharedFilesData, error: sharedFilesError } = await supabase
        .from('file_sharing')
        .select(`
          file_id, access_type, 
          files (id, user_id, file_name, file_size, file_type, storage_url, created_at)
        `)
        .eq('shared_with', user_id);

      if (sharedFilesError) throw sharedFilesError;

      // 3) Fetch file-sharing records (who has access to each file)
      const fileIds = [...ownedFiles.map(f => f.id), ...sharedFilesData.map(s => s.file_id)];
      let sharingData = [];
      if (fileIds.length) {
        const { data: sharingRows, error: sharingError } = await supabase
          .from('file_sharing')
          .select('file_id, shared_with, access_type')
          .in('file_id', fileIds);

        if (sharingError) throw sharingError;
        sharingData = sharingRows;
      }

      // 4) Fetch user details for shared users
      const sharedUserIds = [...new Set(sharingData.map(s => s.shared_with))];
      let sharedUsers = [];
      if (sharedUserIds.length) {
        sharedUsers = await fetchUsersByIds(sharedUserIds);
      }

      // 5) Create a map: file_id -> shared users array
      const sharedMap = {};
      for (const share of sharingData) {
        const user = sharedUsers.find((u) => u.id === share.shared_with);
        if (!sharedMap[share.file_id]) {
          sharedMap[share.file_id] = [];
        }
        sharedMap[share.file_id].push({
          id: user?.id,
          name: user?.full_name || 'Unknown',
          email: user?.email || '',
          avatarUrl: user?.avatar_url || '',
          permission: share.access_type, // 'view' or 'edit'
        });
      }

      // 6) Format owned files
      const ownedFilesFormatted = ownedFiles.map((file) => ({
        id: file.id,
        name: file.file_name,
        url: supabase.storage.from('file_attachments').getPublicUrl(file.storage_url)?.data.publicUrl || '',
        type: file.file_type,
        size: file.file_size,
        createdAt: file.created_at,
        modifiedAt: file.created_at,
        isFavorited: file.is_favorite,
        tags: [],
        shared: sharedMap[file.id] || [], // Attach shared user details
        isShared: false,
        accessType: 'owner',
      }));

      // 7) Format shared files (files shared **with** the user)
      const sharedFilesFormatted = sharedFilesData.map((record) => {
        const file = record.files;
        if (!file) return null; // Skip if the file doesn't exist

        return {
          id: file.id,
          name: file.file_name,
          url: supabase.storage.from('file_attachments').getPublicUrl(file.storage_url)?.data.publicUrl || '',
          type: file.file_type,
          size: file.file_size,
          createdAt: file.created_at,
          modifiedAt: file.created_at,
          isFavorited: false, // Favoriting logic applies only to owned files
          tags: [],
          shared: sharedMap[file.id] || [], // Attach shared user details
          isShared: true,
          accessType: record.access_type,
          ownerId: file.user_id, // Who originally uploaded the file
        };
      }).filter(Boolean); // Remove null values

      // 8) Fetch folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('id, folder_name, created_at')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (foldersError) throw foldersError;

      const folders = foldersData.map((folder) => ({
        id: folder.id,
        name: folder.folder_name,
        url: '',
        type: 'folder',
        size: null,
        totalFiles: 0,
        createdAt: folder.created_at,
        modifiedAt: folder.created_at,
        isFavorited: false,
        tags: [],
        shared: [],
      }));

      // 9) Merge everything and return
      return [...folders, ...ownedFilesFormatted, ...sharedFilesFormatted];
    }
  );

  useEffect(() => {
    const channel = supabase
      .channel('file_sharing_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'file_sharing' }, (payload) => {
        console.log("🔄 Realtime update in file_sharing:", payload);
        mutate(['get_files', user_id]); // Refresh file list in real-time
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // Cleanup when component unmounts
    };
  }, [user_id]);

  return {
    data: data || [],
    isLoading,
    isError: error,
  };
}


// ----------------------------------------------------------------------------

export async function uploadFiles(user_id, files, folder_name = null) {
  try {
    for (const file of files) {
      const base64Response = await fetch(file.file_base64);
      const blob = await base64Response.blob();

      const filePath = folder_name
        ? `${user_id}/${folder_name}/${file.file_name}`
        : `${user_id}/${file.file_name}`;

      const { data, error: storageError } = await supabase.storage
        .from('file_attachments')
        .upload(filePath, blob, {
          contentType: `application/${file.file_type || 'octet-stream'}`,
        });

      if (storageError) {
        console.error('Supabase Storage upload error:', storageError.message);
        throw storageError;
      }

      // ------------------------------------------------------
      const { error: dbError } = await supabase
        .from('files')
        .insert([{
          user_id,
          file_name: file.file_name,
          file_type: file.file_type,
          file_size: file.file_size,
          storage_url: data.path,
          folder_id: null, // or you can handle folder if you prefer
        }]);

      if (dbError) {
        console.error('DB Insert error:', dbError.message);
        throw dbError;
      }
    }
    mutate(['get_files', user_id]);

    // If all uploads succeeded
    return { success: true };
  } catch (error) {
    console.error('Error in uploadFiles:', error);
    return { success: false, error };
  }
}

// ----------------------------------------------------------------------------
// Delete files using Supabase Storage and remove metadata from the database.
// This function loops through fileIds, removes the file from storage, then deletes the record.
export async function deleteFiles(user_id, fileIds) {
  console.log("DEBUG deleting files", fileIds)

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

export async function toggleFavoriteFile(fileId, userId, currentValue) {
  // currentValue = the file's current is_favorite boolean
  // We'll flip it to the opposite
  const newValue = !currentValue;

  const { data, error } = await supabase
    .from('files')
    .update({ is_favorite: newValue })
    .eq('id', fileId)
    .eq('user_id', userId)
    .select(); // returns updated rows

  if (error) {
    console.error('toggleFavorite error:', error.message);
    return { success: false, error };
  }

  // Refresh SWR so UI updates
  mutate(['get_files', userId]);

  return { success: true, data };
}

export async function shareFile(ownerId, fileId, recipientId, accessType = 'view') {
  try {
    // 1) Check that the file belongs to the owner
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('user_id')
      .eq('id', fileId)
      .single();

    if (fileError) throw fileError;
    if (!fileData || fileData.user_id !== ownerId) {
      throw new Error('You do not own this file and cannot share it.');
    }

    // 2) Insert/Update the `file_sharing` table
    const { error: shareError } = await supabase
      .from('file_sharing')
      .upsert([
        {
          file_id: fileId,
          shared_with: recipientId,
          access_type: accessType, // 'view' or 'edit'
        }
      ]);

    if (shareError) throw shareError;

    // Optionally re-fetch the file list if you want immediate UI update
    mutate(['get_files', ownerId]);

    return { success: true };
  } catch (error) {
    console.error('Error sharing file:', error);
    return { success: false, error };
  }
}
