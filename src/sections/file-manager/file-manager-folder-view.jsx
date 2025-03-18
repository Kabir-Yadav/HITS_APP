'use client';

import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import { Typography, LinearProgress } from '@mui/material';
import { tableCellClasses } from '@mui/material/TableCell';
import { tablePaginationClasses } from '@mui/material/TablePagination';

import { useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';

import { removeFilesFromFolder } from 'src/actions/filemanager';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import {
    TableNoData,
    TableHeadCustom,
    TableSelectedAction,
    TablePaginationCustom,
} from 'src/components/table';

import { FileManagerTableRow } from './file-manager-table-row';
import { FileManagerNewFolderDialog } from './file-manager-new-folder-dialog';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
    { id: 'name', label: 'Name' },
    { id: 'size', label: 'Size', width: 120 },
    { id: 'type', label: 'Type', width: 120 },
    { id: 'modifiedAt', label: 'Modified', width: 140 },
    { id: 'shared', label: 'Shared', align: 'right', width: 140 },
    { id: '', width: 88 },
];

// ----------------------------------------------------------------------

export function FileManagerFolderView({
    userId,
    sx,
    table,
    notFound,
    folderId,
    isLoading,
    exisitingFolderName = '',
    onDeleteRow,
    dataFiltered,
    onOpenConfirm,
    onCreateFolder,
    onRemoveFiles,
    ...other
}) {
    const {
        dense,
        page,
        order,
        orderBy,
        rowsPerPage,
        /********/
        selected,
        onSelectRow,
        onSelectAllRows,
        /********/
        onSort,
        onChangeDense,
        onChangePage,
        onChangeRowsPerPage,
    } = table;

    const newFilesDialog = useBoolean();
    const [folderName, setFolderName] = useState('');
    useEffect(() => {
        if (folderId) {
            setFolderName(exisitingFolderName);
        }
    }, [folderId, exisitingFolderName]);

    const router = useRouter();
    const selectedFiles = dataFiltered
        .filter((row) => selected.includes(row.id)) // Exclude the current folderId
        .map((file) => ({
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
        }));
    const renderNewFilesDialog = () => (
        <FileManagerNewFolderDialog
            open={newFilesDialog.value}
            onClose={() => {
                newFilesDialog.onFalse();
                setFolderName('');
            }}
            userId={userId}
            title="Create Folder"
            onCreate={() => {
                onCreateFolder(userId, selected, folderName);
                newFilesDialog.onFalse();
                setFolderName('');
            }}
            isCreatingFolder
            selectedfiles={selectedFiles}
            folderName={folderName} // ✅ Pass folder name
            onChangeFolderName={(e) => setFolderName(e.target.value)}
        />
    );

    const handleRemoveFilefromFolder = useCallback(async (fileId) => {
        // ✅ Handle remove file from folder
        const { data, error } = await removeFilesFromFolder(userId, folderId, [fileId]);
        if (error) {
            toast.error('Error removing file from folder');
        } else {
            toast.success('File removed from folder');
        }
    }, [userId, folderId]);

    return (
        <>
            <Box sx={{ gap: 2, pb: 2, display: 'flex', alignItems: 'center' }}>
                <IconButton color="inherit" onClick={() => router.back()}>
                    <Iconify icon="eva:arrow-back-fill" />
                </IconButton>
                <FileThumbnail
                    file="folder"
                    sx={{ width: 48, height: 48 }} // Increased size
                />

                <Typography
                    noWrap
                    variant="inherit"
                    sx={{
                        maxWidth: 360,
                        cursor: 'pointer',
                    }}
                >
                    {folderName}
                </Typography>
            </Box>
            {isLoading ? (
                <LinearProgress />
            ) : (
                <Box
                    sx={[
                        (theme) => ({ position: 'relative', m: { md: theme.spacing(-2, -3, 0, -3) } }),
                        ...(Array.isArray(sx) ? sx : [sx]),
                    ]}
                    {...other}
                >
                    <TableSelectedAction
                        dense={dense}
                        numSelected={selected.length}
                        rowCount={dataFiltered.filter((row) => row.accessType === 'owner').length} // ✅ Count only owner rows
                        onSelectAllRows={(checked) =>
                            onSelectAllRows(
                                checked,
                                dataFiltered
                                    .filter((row) => row.accessType === 'owner') // ✅ Select only owner items
                                    .map((row) => row.id)
                            )
                        }
                        action={
                            <>
                                <Tooltip title="Create Folder">
                                    <IconButton color="primary" onClick={newFilesDialog.onTrue}>
                                        <Iconify icon="solar:add-folder-bold" />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Share">
                                    <IconButton color="primary">
                                        <Iconify icon="solar:share-bold" />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Delete">
                                    <IconButton color="primary" onClick={onOpenConfirm}>
                                        <Iconify icon="solar:trash-bin-trash-bold" />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Remove">
                                    <IconButton color="primary" onClick={onRemoveFiles}>
                                        <Iconify icon="solar:close-circle-bold" />
                                    </IconButton>
                                </Tooltip>

                            </>
                        }
                        sx={{
                            pl: 1,
                            pr: 2,
                            top: 16,
                            left: 24,
                            right: 24,
                            width: 'auto',
                            borderRadius: 1.5,
                        }}
                    />

                    <TableContainer sx={{ px: { md: 3 } }}>
                        <Table
                            size={dense ? 'small' : 'medium'}
                            sx={{ minWidth: 960, borderCollapse: 'separate', borderSpacing: '0 16px' }}
                        >
                            <TableHeadCustom
                                order={order}
                                orderBy={orderBy}
                                headCells={TABLE_HEAD}
                                rowCount={dataFiltered.filter((row) => row.accessType === 'owner').length} // ✅ Count only owner rows
                                numSelected={selected.length}
                                onSort={onSort}
                                onSelectAllRows={(checked) =>
                                    onSelectAllRows(
                                        checked,
                                        dataFiltered
                                            .filter((row) => row.accessType === 'owner') // ✅ Select only owner items
                                            .map((row) => row.id)
                                    )
                                }
                                sx={{
                                    [`& .${tableCellClasses.head}`]: {
                                        '&:first-of-type': { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
                                        '&:last-of-type': { borderTopRightRadius: 12, borderBottomRightRadius: 12 },
                                    },
                                }}
                            />

                            <TableBody>
                                {dataFiltered
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((row) => (
                                        <FileManagerTableRow
                                            userId={userId}
                                            key={row.id}
                                            row={row}
                                            selected={selected.includes(row.id)}
                                            onRemoveFilefromFolder={() => handleRemoveFilefromFolder(row.id)}
                                            onSelectRow={() => onSelectRow(row.id)}
                                            onDeleteRow={() => onDeleteRow(row)}
                                            isinFolder
                                        />
                                    ))}

                                <TableNoData
                                    notFound={notFound}
                                    sx={[
                                        (theme) => ({
                                            m: -2,
                                            borderRadius: 1.5,
                                            border: `dashed 1px ${theme.vars.palette.divider}`,
                                        }),
                                    ]}
                                />
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            <TablePaginationCustom
                page={page}
                dense={dense}
                rowsPerPage={rowsPerPage}
                count={dataFiltered.length}
                onPageChange={onChangePage}
                onChangeDense={onChangeDense}
                onRowsPerPageChange={onChangeRowsPerPage}
                sx={{ [`& .${tablePaginationClasses.toolbar}`]: { borderTopColor: 'transparent' } }}
            />
            {renderNewFilesDialog()}
        </>
    );
}
