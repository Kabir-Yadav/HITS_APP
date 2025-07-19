import React, { useState } from 'react';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Box,
  Typography,
  Divider,
  Alert,
  Chip,
  IconButton,
  Paper,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';
import { UploadBox } from 'src/components/upload';

export default function ReimbursementFormDialog({ open, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    date: null,
    category: '',
    description: '',
    amount: '',
    receipt: null,
    receiptPreview: null,
  });
  const [errors, setErrors] = useState({});

  const categories = [
    'Travel',
    'Meals & Entertainment',
    'Supplies & Equipment',
    'Transportation',
    'Accommodation',
    'Training & Development',
    'Other',
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          receipt: 'File size must be less than 5MB',
        }));
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          receipt: 'Only JPEG, PNG, GIF, and PDF files are allowed',
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        receipt: file,
        receiptPreview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      }));

      // Clear any previous errors
      setErrors((prev) => ({
        ...prev,
        receipt: null,
      }));
    }
  };

  const handleRemoveFile = () => {
    if (formData.receiptPreview) {
      URL.revokeObjectURL(formData.receiptPreview);
    }
    setFormData((prev) => ({
      ...prev,
      receipt: null,
      receiptPreview: null,
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.receipt) newErrors.receipt = 'Receipt is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    // Clean up object URL
    if (formData.receiptPreview) {
      URL.revokeObjectURL(formData.receiptPreview);
    }

    // Reset form
    setFormData({
      date: null,
      category: '',
      description: '',
      amount: '',
      receipt: null,
      receiptPreview: null,
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            New Reimbursement Claim
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Fill in the details for your expense reimbursement
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Grid container spacing={3}>
          {/* Date and Category Row */}
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Expense Dat"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              sx={{
                width: '100%',
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl
              fullWidth
              error={!!errors.category}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            >
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
              {errors.category && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                  {errors.category}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Amount */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              error={!!errors.amount}
              helperText={errors.amount}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description || 'Provide details about your expense'}
              placeholder="e.g., Client dinner at The Restaurant, Flight tickets from NYC to LA"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>

          {/* Receipt Upload */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Receipt Upload *
            </Typography>

            {!formData.receipt ? (
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
                  <UploadBox
                    onDrop={handleFileUpload}
                    placeholder={
                      <Box
                        sx={{
                          gap: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          color: 'text.disabled',
                          flexDirection: 'column',
                        }}
                      >
                        <Iconify icon="eva:cloud-upload-fill" width={40} />
                        <Typography variant="body2">Upload file</Typography>
                      </Box>
                    }
                    sx={{
                      py: 2.5,
                      width: 'auto',
                      height: 'auto',
                      borderRadius: 1.5,
                    }}
                  />
                </Box>
              </Grid>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {formData.receiptPreview && (
                    <Box
                      component="img"
                      src={formData.receiptPreview}
                      alt="Receipt preview"
                      sx={{
                        width: 60,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0',
                      }}
                    />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {formData.receipt.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(formData.receipt.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                  <Chip
                    label={formData.receipt.type.includes('image') ? 'Image' : 'PDF'}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <IconButton size="small" onClick={handleRemoveFile} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            )}

            {errors.receipt && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {errors.receipt}
              </Alert>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 1.5 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{ borderRadius: 1.5, minWidth: 120 }}
        >
          Submit Claim
        </Button>
      </DialogActions>
    </Dialog>
  );
}
