import { useEffect } from 'react';
import useSWR, { mutate } from 'swr';

import { supabase } from 'src/lib/supabase';


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
      // 1) Fetch Owned Files
      const { data: ownedFiles, error: ownedFilesError } = await supabase
        .from('files')
        .select('id, user_id, file_name, file_size, file_type, storage_url, created_at, folder_id')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (ownedFilesError) throw ownedFilesError;

      // 2) Fetch Shared Files (files shared **with** the user)
      const { data: sharedFilesData, error: sharedFilesError } = await supabase
        .from('file_sharing')
        .select(`
          file_id, access_type, 
          files (id, user_id, file_name, file_size, file_type, storage_url, created_at, folder_id)
        `)
        .eq('shared_with', user_id);

      if (sharedFilesError) throw sharedFilesError;

      // 3) Gather all file IDs to fetch sharing data
      const fileIds = [
        ...ownedFiles.map((f) => f.id),
        ...sharedFilesData.map((s) => s.file_id),
      ];

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
      const sharedUserIds = [...new Set(sharingData.map((s) => s.shared_with))];
      let sharedUsers = [];
      if (sharedUserIds.length) {
        sharedUsers = await fetchUsersByIds(sharedUserIds);
      }

      // 5) Build map: file_id -> shared users
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

      // 6) Fetch User's Favorites
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('file_favorites')
        .select('file_id, folder_id')
        .eq('user_id', user_id);

      if (favoritesError) throw favoritesError;
      const favoriteFileIds = new Set(favoritesData.map((fav) => fav.file_id));
      const favoriteFolderIds = new Set(favoritesData.map((fav) => fav.folder_id).filter(Boolean));

      // 7) Fetch Folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('id, folder_name, created_at')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (foldersError) throw foldersError;

      // 8) Compute Folder Sizes & File Counts
      const folderMap = {};
      for (const file of ownedFiles) {
        if (file.folder_id) {
          if (!folderMap[file.folder_id]) {
            folderMap[file.folder_id] = { totalFiles: 0, totalSize: 0 };
          }
          folderMap[file.folder_id].totalFiles += 1;
          folderMap[file.folder_id].totalSize += file.file_size;
        }
      }

      // 9) Format Folders
      const folders = foldersData.map((folder) => ({
        id: folder.id,
        name: folder.folder_name,
        url: '',
        type: 'folder',
        size: folderMap[folder.id]?.totalSize || 0,
        totalFiles: folderMap[folder.id]?.totalFiles || 0,
        createdAt: folder.created_at,
        modifiedAt: folder.created_at,
        isFavorited: favoriteFolderIds.has(folder.id),
        tags: [],
        shared: [],
        accessType: 'owner',
        isInFolder: false, // Folders are always top-level in your DB
      }));

      // 10) Format Owned Files (**do not** skip those inside folders)
      const ownedAllFiles = ownedFiles.map((file) => {
        const isRoot = !file.folder_id;
        return {
          id: file.id,
          name: file.file_name,
          url: supabase.storage
            .from('file_attachments')
            .getPublicUrl(file.storage_url)?.data.publicUrl || '',
          type: file.file_type,
          size: file.file_size,
          createdAt: file.created_at,
          modifiedAt: file.created_at,
          isFavorited: favoriteFileIds.has(file.id),
          tags: [],
          shared: sharedMap[file.id] || [],
          isShared: false,
          accessType: 'owner',
          isInFolder: !isRoot, // If folder_id != null => true
        };
      });

      // 11) Format Shared Files (also do not skip folder_id)
      const sharedAllFiles = sharedFilesData
        .map((record) => {
          const file = record.files;
          if (!file) return null;
          const isRoot = !file.folder_id;
          return {
            id: file.id,
            name: file.file_name,
            url: supabase.storage
              .from('file_attachments')
              .getPublicUrl(file.storage_url)?.data.publicUrl || '',
            type: file.file_type,
            size: file.file_size,
            createdAt: file.created_at,
            modifiedAt: file.created_at,
            isFavorited: favoriteFileIds.has(file.id),
            tags: [],
            shared: sharedMap[file.id] || [],
            isShared: true,
            accessType: record.access_type, // 'view' or 'edit'
            ownerId: file.user_id,
            isInFolder: !isRoot, // If folder_id != null => true
          };
        })
        .filter(Boolean); // remove null

      // 12) Merge Everything => folders + all files
      // => So the "Favorites" can see files inside folders as well.
      return [...folders, ...ownedAllFiles, ...sharedAllFiles];
    }
  );

  // Realtime subscription so changes in file_sharing are auto-updated
  useEffect(() => {
    const channel = supabase
      .channel('file_sharing_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'file_sharing' }, (payload) => {
        console.log('🔄 Realtime update in file_sharing:', payload);
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

export async function uploadFiles(user_id, files, folder_name = null, folderId = null) {
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
          folder_id: folderId, // or you can handle folder if you prefer
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
export async function deleteEntities(userId, items) {
  try {
    if (!items.length) {
      throw new Error('No items selected for deletion.');
    }

    // Optionally, gather file storage URLs to remove them in fewer calls
    // We'll do a per-item approach here, but you can optimize further if needed

    for (const item of items) {
      if (item.type === 'folder') {
        // ----- DELETE FOLDER -----
        // 1) Optional: Orphan or remove child files
        //    If you want to orphan child files, do: 
        //    await supabase.from('files').update({ folder_id: null }).eq('folder_id', item.id);
        //    If you have ON DELETE CASCADE from folders -> files, or you want to fully remove them, handle that here.

        const { error: folderError } = await supabase
          .from('folders')
          .delete()
          .eq('id', item.id)
          .eq('user_id', userId); // ownership check

        if (folderError) throw folderError;

      } else {
        // ----- DELETE FILE -----
        // 1) Fetch file to get storage_url (so we can remove from Supabase Storage)
        const { data: fileData, error: fileError } = await supabase
          .from('files')
          .select('user_id, storage_url')
          .eq('id', item.id)
          .single();

        if (fileError) throw fileError;

        // ownership check
        if (fileData.user_id !== userId) {
          throw new Error(`You do not own file ID = ${item.id}`);
        }

        // 2) Remove from storage
        if (fileData.storage_url) {
          const { error: removeError } = await supabase.storage
            .from('file_attachments')
            .remove([fileData.storage_url]);
          if (removeError) throw removeError;
        }

        // 3) Delete from files table
        const { error: fileDelError } = await supabase
          .from('files')
          .delete()
          .eq('id', item.id)
          .eq('user_id', userId);
        if (fileDelError) throw fileDelError;
      }
    }

    // Finally, revalidate so your SWR-based UI updates
    mutate(['get_files', userId]);

    return { success: true };
  } catch (error) {
    console.error('Error deleting entities:', error);
    return { success: false, error };
  }
}

export async function toggleFavorite(entityId, userId, isCurrentlyFavorited, isFolder = false) {
  try {
    if (!entityId) {
      return { success: false, error: 'No file or folder specified.' };
    }

    const favoriteObj = isFolder
      ? { user_id: userId, folder_id: entityId }
      : { user_id: userId, file_id: entityId };

    if (isCurrentlyFavorited) {
      // Remove from favorites
      const { error } = await supabase
        .from('file_favorites')
        .delete()
        .match(favoriteObj); // match user_id + (folder_id or file_id)
      if (error) throw error;
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('file_favorites')
        .insert([favoriteObj]);
      if (error) throw error;
    }

    // Refresh SWR so UI updates
    mutate(['get_files', userId]);

    return { success: true };
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return { success: false, error };
  }
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

export async function createFolder(userId, folderName, selectedFiles = []) {
  if (!userId || !folderName) {
    return { success: false, error: 'User ID and folder name are required.' };
  }

  try {
    // Step 1: Insert folder into the database
    const { data: folderData, error: folderError } = await supabase
      .from('folders')
      .insert([{ user_id: userId, folder_name: folderName }])
      .select()
      .single();

    if (folderError) throw folderError;

    const folderId = folderData.id;

    // Step 2: Move selected files into the folder
    if (selectedFiles.length > 0) {
      console.log(selectedFiles)
      const { error: updateError } = await supabase
        .from('files')
        .update({ folder_id: folderId })
        .in('id', selectedFiles);

      if (updateError) throw updateError;
    }

    // Step 3: Refresh UI
    mutate(['get_files', userId]);

    return { success: true, folderId };
  } catch (error) {
    console.error('Error creating folder:', error);
    return { success: false, error };
  }
}

export async function getFolderContents(userId, folderId) {
  try {
    // 1) Fetch Files inside the Folder
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('id, user_id, file_name, file_size, file_type, storage_url, created_at, folder_id')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (filesError) throw filesError;

    // 2) Fetch File Sharing Data for Shared Files in the Folder
    const fileIds = files.map((f) => f.id);
    let sharingData = [];
    if (fileIds.length) {
      const { data: sharingRows, error: sharingError } = await supabase
        .from('file_sharing')
        .select('file_id, shared_with, access_type')
        .in('file_id', fileIds);

      if (sharingError) throw sharingError;
      sharingData = sharingRows;
    }

    // 3) Fetch User Details for Shared Users
    const sharedUserIds = [...new Set(sharingData.map((s) => s.shared_with))];
    let sharedUsers = [];
    if (sharedUserIds.length) {
      sharedUsers = await fetchUsersByIds(sharedUserIds);
    }

    // 4) Create a Map: file_id -> shared users array
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

    // 5) Fetch User's Favorites
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('file_favorites')
      .select('file_id, folder_id')
      .eq('user_id', userId);

    if (favoritesError) throw favoritesError;
    const favoriteFileIds = new Set(favoritesData.map((fav) => fav.file_id));

    // 6) Compute Folder Size & File Count
    const totalSize = files.reduce((acc, file) => acc + file.file_size, 0);
    const totalFiles = files.length;

    // 7) Format Files inside the Folder
    const formattedFiles = files.map((file) => ({
      id: file.id,
      name: file.file_name,
      url: supabase.storage
        .from('file_attachments')
        .getPublicUrl(file.storage_url)?.data.publicUrl || '',
      type: file.file_type,
      size: file.file_size,
      createdAt: file.created_at,
      modifiedAt: file.created_at,
      isFavorited: favoriteFileIds.has(file.id),
      tags: [],
      shared: sharedMap[file.id] || [],
      isShared: sharedMap[file.id]?.length > 0,
      accessType: userId === file.user_id ? 'owner' : 'shared',
    }));

    // 8) Fetch Folder Info
    const { data: folderData, error: folderError } = await supabase
      .from('folders')
      .select('id, folder_name, created_at')
      .eq('id', folderId)
      .single();

    if (folderError) throw folderError;

    // 9) Format Folder Info
    const folder = {
      id: folderData.id,
      name: folderData.folder_name,
      url: '',
      type: 'folder',
      size: totalSize,
      totalFiles: totalFiles,
      createdAt: folderData.created_at,
      modifiedAt: folderData.created_at,
      isFavorited: favoriteFileIds.has(folderId),
      tags: [],
      shared: [],
      accessType: 'owner',
    };

    // 10) Merge Folder Info and Files
    return { success: true, data: [folder, ...formattedFiles] };
  } catch (error) {
    console.error('Error fetching folder contents:', error);
    return { success: false, error };
  }
}

export async function updateFolderName(userId, folderId, newName) {
  try {
    // (Optional) Check if the folder belongs to this user
    // e.g. SELECT user_id FROM folders WHERE id = folderId => must match userId

    const { error } = await supabase
      .from('folders')
      .update({ folder_name: newName })
      .eq('id', folderId)
      .eq('user_id', userId); // ensure only the owner can rename

    if (error) throw error;

    // Revalidate user’s file/folder list
    mutate(['get_files', userId]);

    return { success: true };
  } catch (error) {
    console.error('Error updating folder name:', error);
    return { success: false, error };
  }
}

export async function removeFilesFromFolder(userId, folderId, fileIds) {
  if (!fileIds?.length) {
    return { success: false, error: 'No files specified.' };
  }
  try {
    // Move these files to root (folder_id = null)
    const { error } = await supabase
      .from('files')
      .update({ folder_id: null })
      .in('id', fileIds)
      .eq('folder_id', folderId)      // ensure they're currently in that folder
      .eq('user_id', userId);         // ensure user owns them, or do an ownership check

    if (error) throw error;

    // Revalidate user’s file/folder list
    mutate(['get_files', userId]);

    return { success: true };
  } catch (error) {
    console.error('Error removing files from folder:', error);
    return { success: false, error };
  }
}

export async function addFilesToFolder(userId, folderId, fileIds) {
  if (!fileIds?.length) {
    return { success: false, error: 'No files specified.' };
  }

  try {
    const { error } = await supabase
      .from('files')
      .update({ folder_id: folderId })
      .in('id', fileIds)
      .eq('user_id', userId); // optional ownership check

    if (error) throw error;

    // Revalidate user’s file/folder list
    mutate(['get_files', userId]);

    return { success: true };
  } catch (error) {
    console.error('Error adding files to folder:', error);
    return { success: false, error };
  }
}