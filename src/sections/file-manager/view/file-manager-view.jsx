'use client';

import { useState, useCallback, useEffect } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2'
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';

import { fIsAfter, fIsBetween } from 'src/utils/format-time';

import { CONFIG } from 'src/global-config';
import { deleteEntities } from 'src/actions/filemanager';
import { DashboardContent } from 'src/layouts/dashboard';
import useGetFiles, { createFolder } from 'src/actions/filemanager';
import { _allFiles, FILE_TYPE_OPTIONS, _files, _folders } from 'src/_mock';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { fileFormat } from 'src/components/file-thumbnail';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { useTable, rowInPage, getComparator } from 'src/components/table';

import { useMockedUser } from 'src/auth/hooks';

import { FileRecentItem } from '../file-recent-item';
import { FileManagerPanel } from '../file-manager-panel';
import { FileManagerTable } from '../file-manager-table';
import { FileManagerFilters } from '../file-manager-filters';
import { FileStorageOverview } from '../file-storage-overview';
import { FileManagerGridView } from '../file-manager-grid-view';
import { FileManagerFolderItem } from '../file-manager-folder-item';
import { FileManagerFiltersResult } from '../file-manager-filters-result';
import { FileManagerNewFolderDialog } from '../file-manager-new-folder-dialog';

// ----------------------------------------------------------------------

export function FileManagerView() {
  const table = useTable({ defaultRowsPerPage: 10 });
  const { user } = useMockedUser()
  const dateRange = useBoolean();
  const confirmDialog = useBoolean();
  const newFilesDialog = useBoolean();

  const [displayMode, setDisplayMode] = useState('list');

  const userId = user.id;
  const { data, isLoading, isError } = useGetFiles(userId);
  const [tableData, setTableData] = useState([]);
  const GB = 100000000 * 1;
  const totalGB = GB; // 24 GB

  // ✅ Update tableData when data changes
  useEffect(() => {
    if (data && JSON.stringify(data) !== JSON.stringify(tableData)) {
      setTableData(data);
    }
  }, [data]);

  const filters = useSetState({
    name: '',
    type: [],
    startDate: null,
    endDate: null,
  });
  const { state: currentFilters } = filters;

  const dateError = fIsAfter(currentFilters.startDate, currentFilters.endDate);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: () => { },
    filters: currentFilters,
    dateError,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset =
    !!currentFilters.name ||
    currentFilters.type.length > 0 ||
    (!!currentFilters.startDate && !!currentFilters.endDate);

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleChangeView = useCallback((event, newView) => {
    if (newView !== null) {
      setDisplayMode(newView);
    }
  }, []);

  const handleDeleteItem = useCallback(async (item) => {
    console.log(item, '<=')
    try {
      const result = await deleteEntities(userId, [item]); // API call with single file

      if (result.success) {
        toast.success(`${item.type.toUpperCase()} deleted successfully!`);

        // ✅ Remove the deleted file from `tableData`
        setTableData((prevData) => prevData.filter((row) => row.id !== item.id));

        // ✅ Clear selection if this file was selected
        table.setSelected((prevSelected) => prevSelected.filter((selectedId) => selectedId !== item.id));

        // ✅ Update pagination if needed
        table.onUpdatePageDeleteRow(dataInPage.length);
      } else {
        throw new Error('Failed to delete file.');
      }
    } catch (error) {
      toast.error('Error deleting file.');
      console.error(error);
    }
  }, [userId, tableData]);


  const handleDeleteItems = useCallback(async () => {
    if (!table.selected.length) {
      toast.error('No files selected for deletion.');
      return;
    }

    try {
      const deletiondata = tableData.filter((file) => table.selected.includes(file.id))
      const result = await deleteEntities(userId, deletiondata);

      if (result.success) {
        toast.success('Files deleted successfully!');
        table.setSelected([]);

        // ✅ Remove deleted items from tableData
        setTableData((prevData) => prevData.filter((row) => !table.selected.includes(row.id)));

        // ✅ Update table pagination if needed
        table.onUpdatePageDeleteRows(dataInPage.length, dataFiltered.length);
      } else {
        throw new Error('Failed to delete files.');
      }
    } catch (error) {
      toast.error('Error deleting files.');
      console.error(error);
    }
  }, [userId, table.selected,]);

  const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const MEDIA_TYPES = ['mp4', 'mp3', 'wav', 'm4v', 'avi']; // etc.
  const DOC_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']; // etc.

  // 2) Sum total usage
  const totalUsedBytes = tableData
    .filter((item) => item.type !== 'folder')
    .reduce((acc, file) => acc + (file.size || 0), 0);
  // 3) Sum usage by category
  const imageUsedBytes = tableData
    .filter((f) => IMAGE_TYPES.includes(f.type?.toLowerCase()))
    .reduce((acc, file) => acc + (file.size || 0), 0);

  const mediaUsedBytes = tableData
    .filter((f) => MEDIA_TYPES.includes(f.type?.toLowerCase()))
    .reduce((acc, file) => acc + (file.size || 0), 0);

  const docUsedBytes = tableData
    .filter((f) => DOC_TYPES.includes(f.type?.toLowerCase()))
    .reduce((acc, file) => acc + (file.size || 0), 0);

  const otherUsedBytes = totalUsedBytes - (imageUsedBytes + mediaUsedBytes + docUsedBytes);

  const renderFilters = () => (
    <Box
      sx={{
        gap: 2,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-end', md: 'center' },
      }}
    >
      <FileManagerFilters
        filters={filters}
        dateError={dateError}
        onResetPage={table.onResetPage}
        openDateRange={dateRange.value}
        onOpenDateRange={dateRange.onTrue}
        onCloseDateRange={dateRange.onFalse}
        options={{ types: FILE_TYPE_OPTIONS }}
      />

      <ToggleButtonGroup size="small" value={displayMode} exclusive onChange={handleChangeView}>
        <ToggleButton value="list">
          <Iconify icon="solar:list-bold" />
        </ToggleButton>

        <ToggleButton value="grid">
          <Iconify icon="mingcute:dot-grid-fill" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );

  const renderResults = () => (
    <FileManagerFiltersResult
      filters={filters}
      totalResults={dataFiltered.length}
      onResetPage={table.onResetPage}
    />
  );

  const renderNewFilesDialog = () => (
    < FileManagerNewFolderDialog open={newFilesDialog.value} onClose={newFilesDialog.onFalse} userId={userId} />
  );

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content={
        <>
          Are you sure want to delete <strong> {table.selected.length} </strong> items?
        </>
      }
      action={
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            handleDeleteItems();
            confirmDialog.onFalse();
          }}
        >
          Delete
        </Button>
      }
    />
  );
  const handleCreateFolder = async (user_Id, selectedFiles, folderName) => {
    if (!user_Id || !folderName) {
      toast.error("User ID and folder name are required");
      return;
    }
    console.log(selectedFiles)
    try {
      const result = await createFolder(user_Id, folderName, selectedFiles);

      if (result.success) {
        table.setSelected([]);
        toast.success("Folder created successfully!");
      } else {
        throw new Error("Failed to create folder");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Error creating folder");
    }
  };

  const renderList = () =>
    displayMode === 'list' ? (
      <FileManagerTable
        userId={user.id}
        table={table}
        onCreateFolder={handleCreateFolder}
        dataFiltered={dataFiltered}
        onDeleteRow={handleDeleteItem}
        notFound={notFound}
        onOpenConfirm={confirmDialog.onTrue}
      />
    ) : (
      <FileManagerGridView
        table={table}
        userId={userId}
        dataFiltered={dataFiltered}
        onDeleteItem={handleDeleteItem}
        onOpenConfirm={confirmDialog.onTrue}
      />
    );
  if (isError) {
    return (
      <DashboardContent>
        <Typography variant="h4">File Manager</Typography>
        <EmptyContent title="Error Loading Files" description="Something went wrong. Please try again." />
      </DashboardContent>
    );
  }
  if (isLoading) {
    return (
      <DashboardContent>
        <Typography variant="h4">File Manager</Typography>
        <EmptyContent title="Loading files..." />
      </DashboardContent>
    );
  }

  const renderStorageOverview = () => {
    // We'll pass a "series" for how full the radial chart is
    const usedPercent = (totalUsedBytes / totalGB) * 100;

    return (
      <FileStorageOverview
        // The "total" is your total capacity
        total={totalGB}
        used={totalUsedBytes}
        // The radial bar will show the % used
        chart={{ series: usedPercent }}
        data={[
          {
            name: 'Images',
            usedStorage: imageUsedBytes,
            filesCount: tableData.filter((f) =>
              IMAGE_TYPES.includes(f.type?.toLowerCase())
            ).length,
            icon: (
              <Box component="img" src={`${CONFIG.assetsDir}/assets/icons/files/ic-img.svg`} />
            ),
          },
          {
            name: 'Media',
            usedStorage: mediaUsedBytes,
            filesCount: tableData.filter((f) =>
              MEDIA_TYPES.includes(f.type?.toLowerCase())
            ).length,
            icon: (
              <Box component="img" src={`${CONFIG.assetsDir}/assets/icons/files/ic-video.svg`} />
            ),
          },
          {
            name: 'Documents',
            usedStorage: docUsedBytes,
            filesCount: tableData.filter((f) =>
              DOC_TYPES.includes(f.type?.toLowerCase())
            ).length,
            icon: (
              <Box component="img" src={`${CONFIG.assetsDir}/assets/icons/files/ic-document.svg`} />
            ),
          },
          {
            name: 'Other',
            usedStorage: otherUsedBytes,
            filesCount: tableData.filter((f) => {
              const lowerType = f.type?.toLowerCase();
              return (
                !IMAGE_TYPES.includes(lowerType) &&
                !MEDIA_TYPES.includes(lowerType) &&
                !DOC_TYPES.includes(lowerType) &&
                f.type !== 'folder'
              );
            }).length,
            icon: (
              <Box component="img" src={`${CONFIG.assetsDir}/assets/icons/files/ic-file.svg`} />
            ),
          },
        ]}
      />
    );
  };
  const favoriteItems = tableData
    .filter((item) => item.isFavorited)
    .slice(0, 5);

  const recentFiles = [...tableData]
    .filter((item) => item.type !== 'folder')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <>
      <DashboardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4">File manager</Typography>
          <Button
            variant="contained"
            startIcon={<Iconify icon="eva:cloud-upload-fill" />}
            onClick={newFilesDialog.onTrue}
          >
            Upload
          </Button>
        </Box>

        {/* {Favourite Folders and Files} */}
        <Box sx={{ mt: 5, mb: 4 }}>
          <FileManagerPanel
            title="Favorites"
            link={paths.dashboard.fileManager}
          />
          {favoriteItems.length === 0 ?
            <EmptyContent title="No Favourite Files or Folder" />
            :
            <Scrollbar sx={{ mb: 3, minHeight: 186 }}>
              <Box sx={{ gap: 3, display: 'flex' }}>
                {favoriteItems.map((item) =>
                  item.type === 'folder' ? (
                    <FileManagerFolderItem
                      userId={userId}
                      key={item.id}
                      folder={item}
                      onDelete={() => handleDeleteItem(item.id)}
                      sx={{
                        ...(favoriteItems.length > 3 && {
                          width: 240,
                          flexShrink: 0,
                        }),
                      }}
                    />
                  ) : (
                    <FileManagerFolderItem
                      key={item.id}
                      userId={userId}
                      folder={item}
                      isFolder={false}
                      onDelete={() => handleDeleteItem(item.id)}
                      sx={{
                        ...(favoriteItems.length > 3 && {
                          width: 240,
                          flexShrink: 0,
                        }),
                      }}
                    />
                  )
                )}
              </Box>
            </Scrollbar>
          }
        </Box>

        <Grid container spacing={3}>
          {/* {Recent Files} */}

          <Grid size={{ xs: 12, md: 6, lg: 8 }}>
            <Box >
              <FileManagerPanel
                title="Recent files"
              />

              {recentFiles.length === 0 ?
                <EmptyContent title="No Recent Files" />
                :
                <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
                  {recentFiles.map((file) => (
                    <FileRecentItem
                      userId={userId}
                      key={file.id}
                      file={file}
                      onDelete={() => handleDeleteItem(file)}
                    />
                  ))}
                </Box>
              }
            </Box>
          </Grid>

          {/* {Storage} */}

          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <FileManagerPanel
                title="Storage"
              />
              {renderStorageOverview()}
            </Box>
          </Grid>
        </Grid>

        <Stack spacing={2.5} sx={{ my: { xs: 3, md: 5 } }}>
          {renderFilters()}
          {canReset && renderResults()}
        </Stack>

        {notFound ? <EmptyContent filled sx={{ py: 10 }} /> : renderList()}
      </DashboardContent>

      {renderNewFilesDialog()}
      {renderConfirmDialog()}
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, filters, dateError }) {
  const { name, type, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter((file) => file.name.toLowerCase().includes(name.toLowerCase()));
  }

  if (type.length) {
    inputData = inputData.filter((file) => type.includes(fileFormat(file.type)));
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((file) => fIsBetween(file.createdAt, startDate, endDate));
    }
  }

  return inputData;
}
