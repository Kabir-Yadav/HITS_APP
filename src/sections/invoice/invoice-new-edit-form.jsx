import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { pdf } from '@react-pdf/renderer';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { today } from 'src/utils/format-time';

import { supabase } from 'src/lib/supabase';

import { toast } from 'src/components/snackbar';
import { Field } from 'src/components/hook-form';
import { FormProvider } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { LORPDFDownload, LORPDFDocument } from './invoice-pdf';

// ----------------------------------------------------------------------

export const NewLORSchema = zod.object({
  intern_name: zod.string().min(1, { message: 'Intern name is required!' }),
  issue_date: zod.string().min(1, { message: 'Issue date is required!' }),
});

// ----------------------------------------------------------------------

export function LORNewEditForm({ currentLOR }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const [generatedLOR, setGeneratedLOR] = useState(null);
  const [openPreview, setOpenPreview] = useState(false);

  const defaultValues = {
    intern_name: '',
    issue_date: today('YYYY-MM-DD'),
  };

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(NewLORSchema),
    defaultValues,
    values: currentLOR ? {
      ...currentLOR,
    } : {
      ...defaultValues,
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const savePDFToStorage = async (lorData) => {
    try {
      // Generate PDF blob
      const pdfDoc = <LORPDFDocument lor={lorData} />;
      const blob = await pdf(pdfDoc).toBlob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('lor-pdfs')
        .upload(`${lorData.id}.pdf`, blob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

    } catch (error) {
      console.error('Error saving PDF:', error);
      throw new Error('Failed to save PDF');
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const lorData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (currentLOR?.id) {
        const { error } = await supabase
          .from('lor')
          .update({
            ...lorData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentLOR.id)
          .eq('created_by', user.id);

        if (error) throw error;
        setGeneratedLOR({ ...currentLOR, ...lorData });
        await savePDFToStorage({ ...currentLOR, ...lorData });
      } else {
        const { data: insertedData, error } = await supabase
          .from('lor')
          .insert([
            {
              ...lorData,
              created_by: user.id,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        setGeneratedLOR(insertedData);
        await savePDFToStorage(insertedData);
      }

      setOpenPreview(true);
      toast.success(currentLOR ? 'Update success!' : 'Create success!');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Something went wrong');
    }
  });

  const handleClosePreview = () => {
    setOpenPreview(false);
    reset();
    router.push(paths.dashboard.invoice.root);
  };

  const renderDetails = () => (
    <Card>
      <CardHeader title="Letter of Recommendation Details" subheader="Enter intern information..." sx={{ mb: 3 }} />

      <Divider />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Intern Name</Typography>
          <Field.Text name="intern_name" placeholder="Enter intern name..." />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Issue Date</Typography>
          <Field.Text name="issue_date" type="date" />
        </Stack>
      </Stack>
    </Card>
  );

  const renderActions = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
      <LoadingButton
        type="submit"
        variant="contained"
        size="large"
        loading={isSubmitting}
        sx={{ ml: 2 }}
      >
        {!currentLOR ? 'Generate LOR' : 'Save Changes'}
      </LoadingButton>
    </Box>
  );

  return (
    <>
      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Stack spacing={3} sx={{ mx: 'auto', maxWidth: { xs: 720, xl: 880 } }}>
          {renderDetails()}
          {renderActions()}
        </Stack>
      </FormProvider>

      <Dialog fullWidth maxWidth="md" open={openPreview} onClose={handleClosePreview}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Preview Letter of Recommendation
          </Typography>
          
          {generatedLOR && <LORPDFDownload lor={generatedLOR} />}
        </Box>
      </Dialog>
    </>
  );
}
