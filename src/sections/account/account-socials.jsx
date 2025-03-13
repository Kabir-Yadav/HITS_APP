import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { supabase } from 'src/lib/supabase';
import { TwitterIcon, FacebookIcon, LinkedinIcon, InstagramIcon } from 'src/assets/icons';

import { toast } from 'src/components/snackbar';
import { FormProvider, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const UpdateSocialLinksSchema = zod.object({
  facebook: zod.string().url({ message: 'Must be a valid URL' }).optional().or(zod.literal('')),
  instagram: zod.string().url({ message: 'Must be a valid URL' }).optional().or(zod.literal('')),
  linkedin: zod.string().url({ message: 'Must be a valid URL' }).optional().or(zod.literal('')),
  twitter: zod.string().url({ message: 'Must be a valid URL' }).optional().or(zod.literal('')),
});

// ----------------------------------------------------------------------

export function AccountSocials() {
  const { user } = useAuthContext();
  const [errorMsg, setErrorMsg] = useState('');

  const defaultValues = {
    facebook: user?.user_metadata?.social_links?.facebook || '',
    instagram: user?.user_metadata?.social_links?.instagram || '',
    linkedin: user?.user_metadata?.social_links?.linkedin || '',
    twitter: user?.user_metadata?.social_links?.twitter || '',
  };

  const methods = useForm({
    resolver: zodResolver(UpdateSocialLinksSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...user?.user_metadata,
          social_links: {
            facebook: data.facebook,
            instagram: data.instagram,
            linkedin: data.linkedin,
            twitter: data.twitter,
          },
        },
      });

      if (updateError) throw updateError;

      toast.success('Social links updated successfully!');
      setErrorMsg('');
    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error.message);
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Card
        sx={{
          p: 3,
          gap: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMsg}
          </Alert>
        )}

        <Field.Text
          name="facebook"
          label="Facebook"
          placeholder="https://facebook.com/username"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <FacebookIcon sx={{ width: 24 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <Field.Text
          name="instagram"
          label="Instagram"
          placeholder="https://instagram.com/username"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <InstagramIcon sx={{ width: 24 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <Field.Text
          name="linkedin"
          label="Linkedin"
          placeholder="https://linkedin.com/in/username"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LinkedinIcon sx={{ width: 24 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <Field.Text
          name="twitter"
          label="Twitter"
          placeholder="https://twitter.com/username"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <TwitterIcon sx={{ width: 24 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <LoadingButton type="submit" variant="contained" loading={isSubmitting} sx={{ ml: 'auto' }}>
          Save changes
        </LoadingButton>
      </Card>
    </FormProvider>
  );
}
