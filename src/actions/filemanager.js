import { useMemo } from 'react';
import { keyBy } from 'es-toolkit';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/lib/axios';

const BASE_URL = 'https://apiemployeeos.duckdns.org:8443/api/filemanager';

const enableServer = false;

const swrOptions = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: enableServer,
  revalidateOnReconnect: enableServer,
};

export default function useGetFiles(user_id) {
    const { data, isLoading, error, isValidating } = useSWR(`${BASE_URL}?user_id=${user_id}`, fetcher, swrOptions);
    
    return {
        data: data || [], // ✅ Ensure `data` is always an array
        isLoading,
        isError: error,
    };
}

export async function uploadFiles(user_id, files, folder_name = null) {
    try {
      const payload = {
        user_id,
        files,
        folder_name,
      };
  
      // Send the request
      await axios.post(`${BASE_URL}/upload`, payload);
  
      // ✅ Refresh files list after successful upload
      mutate(`${BASE_URL}?user_id=${user_id}`);
  
      return { success: true };
    } catch (error) {
      console.error('Error uploading files:', error);
      return { success: false, error };
    }
}
  
export async function deleteFiles(user_id, fileIds,) {
    try {
      if (!fileIds.length) {
        throw new Error('No files selected for deletion.');
      }
  
      // Perform API delete requests for each file
      await Promise.all(
        fileIds.map((fileId) =>
          axios.delete(`${BASE_URL}/${fileId}`, {
            data: { user_id }, // Backend expects user_id in request body
          })
        )
      );
  
      // ✅ Refresh file list after deletion
      mutate(`${BASE_URL}?user_id=${user_id}`);
  
        
      return { success: true };
    } catch (error) {
      console.error('Error deleting files:', error);
      return { success: false, error };
    }
  }