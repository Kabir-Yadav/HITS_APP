import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback, useRef } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { LoadingButton } from '@mui/lab';
import Button from '@mui/material/Button';
import Portal from '@mui/material/Portal';
import { alpha } from '@mui/material/styles';
import Collapse from '@mui/material/Collapse';
import Backdrop from '@mui/material/Backdrop';
import InputBase from '@mui/material/InputBase';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import { sendEmail } from 'src/utils/gmail';
import { fData } from 'src/utils/format-number';

import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const POSITION = 20;

export function MailCompose({ onCloseCompose, initialData = {} }) {
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up('sm'));
  const fileInputRef = useRef(null);

  const fullScreen = useBoolean();
  const [sending, setSending] = useState(false);
  const showCc = useBoolean(!!initialData.cc);
  const showBcc = useBoolean(!!initialData.bcc);

  const [to, setTo] = useState(initialData.to || '');
  const [cc, setCc] = useState(initialData.cc || '');
  const [bcc, setBcc] = useState(initialData.bcc || '');
  const [subject, setSubject] = useState(initialData.subject || '');
  const [message, setMessage] = useState(initialData.body || '');
  const [attachments, setAttachments] = useState(initialData.attachments || []);

  useEffect(() => {
    if (initialData) {
      setTo(initialData.to || '');
      setCc(initialData.cc || '');
      setBcc(initialData.bcc || '');
      setSubject(initialData.subject || '');
      setMessage(initialData.body || '');
      setAttachments(initialData.attachments || []);
      
      if (initialData.cc) showCc.onTrue();
      if (initialData.bcc) showBcc.onTrue();
    }
  }, [initialData]);

  const handleChangeMessage = useCallback((value) => {
    setMessage(value);
  }, []);

  const handleChangeTo = useCallback((event) => {
    setTo(event.target.value);
  }, []);

  const handleChangeCc = useCallback((event) => {
    setCc(event.target.value);
  }, []);

  const handleChangeBcc = useCallback((event) => {
    setBcc(event.target.value);
  }, []);

  const handleChangeSubject = useCallback((event) => {
    setSubject(event.target.value);
  }, []);

  const handleAttachFile = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((event) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  }, []);

  const handleRemoveAttachment = useCallback((index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = async () => {
    if (!to || !subject || !message) {
      // TODO: Show error message
      return;
    }

    try {
      setSending(true);
      await sendEmail(to, subject, message, { cc, bcc }, attachments);
      onCloseCompose();
    } catch (error) {
      console.error('Error sending email:', error);
      // TODO: Show error message
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (fullScreen.value) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [fullScreen.value]);

  return (
    <Portal>
      {(fullScreen.value || !smUp) && <Backdrop open sx={[{ zIndex: theme.zIndex.modal - 1 }]} />}

      <Paper
        sx={[
          {
            maxWidth: 560,
            right: POSITION,
            borderRadius: 2,
            display: 'flex',
            bottom: POSITION,
            position: 'fixed',
            overflow: 'hidden',
            flexDirection: 'column',
            zIndex: theme.zIndex.modal,
            width: `calc(100% - ${POSITION * 2}px)`,
            boxShadow: theme.vars.customShadows.dropdown,
            ...(fullScreen.value && { maxWidth: 1, height: `calc(100% - ${POSITION * 2}px)` }),
          },
        ]}
      >
        <Box
          sx={[
            {
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'background.neutral',
              p: theme.spacing(1.5, 1, 1.5, 2),
            },
          ]}
        >
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            New message
          </Typography>

          <IconButton onClick={fullScreen.onToggle}>
            <Iconify icon={fullScreen.value ? 'eva:collapse-fill' : 'eva:expand-fill'} />
          </IconButton>

          <IconButton onClick={onCloseCompose}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>

        <InputBase
          id="mail-compose-to"
          placeholder="To"
          value={to}
          onChange={handleChangeTo}
          endAdornment={
            <Box sx={{ gap: 0.5, display: 'flex', typography: 'subtitle2' }}>
              <Box 
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={showCc.onToggle}
              >
                Cc
              </Box>
              <Box 
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={showBcc.onToggle}
              >
                Bcc
              </Box>
            </Box>
          }
          sx={[
            {
              px: 2,
              height: 48,
              borderBottom: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
            },
          ]}
        />

        <Collapse in={showCc.value}>
          <InputBase
            placeholder="Cc"
            value={cc}
            onChange={handleChangeCc}
            sx={[
              {
                px: 2,
                height: 48,
                borderBottom: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
              },
            ]}
          />
        </Collapse>

        <Collapse in={showBcc.value}>
          <InputBase
            placeholder="Bcc"
            value={bcc}
            onChange={handleChangeBcc}
            sx={[
              {
                px: 2,
                height: 48,
                borderBottom: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
              },
            ]}
          />
        </Collapse>

        <InputBase
          id="mail-compose-subject"
          placeholder="Subject"
          value={subject}
          onChange={handleChangeSubject}
          sx={[
            {
              px: 2,
              height: 48,
              borderBottom: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
            },
          ]}
        />

        <Stack spacing={2} flexGrow={1} sx={{ p: 2, flex: '1 1 auto', overflow: 'hidden' }}>
          <Editor
            value={message}
            onChange={handleChangeMessage}
            placeholder="Type a message"
            slotProps={{ wrapper: { ...(fullScreen.value && { minHeight: 0, flex: '1 1 auto' }) } }}
            sx={{ maxHeight: 480, ...(fullScreen.value && { maxHeight: 1, flex: '1 1 auto' }) }}
          />

          {attachments.length > 0 && (
            <Box 
              sx={{ 
                gap: 1, 
                display: 'flex', 
                flexWrap: 'wrap',
                p: 1,
                borderRadius: 1,
                bgcolor: 'background.neutral',
              }}
            >
              {attachments.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 0.75,
                    borderRadius: 0.75,
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: (themeParam) => alpha(themeParam.palette.grey[500], 0.08),
                  }}
                >
                  <Iconify icon="eva:file-fill" width={20} sx={{ mr: 0.5 }} />
                  <Typography variant="body2" noWrap>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', mx: 0.75 }}>
                    {fData(file.size)}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => handleRemoveAttachment(index)}
                    sx={{ p: 0.25 }}
                  >
                    <Iconify icon="mingcute:close-line" width={16} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                multiple
              />
              <IconButton onClick={handleAttachFile}>
                <Iconify icon="eva:attach-2-fill" />
              </IconButton>
            </Box>

            <LoadingButton
              variant="contained"
              color="primary"
              endIcon={<Iconify icon="iconamoon:send-fill" />}
              loading={sending}
              onClick={handleSend}
            >
              Send
            </LoadingButton>
          </Box>
        </Stack>
      </Paper>
    </Portal>
  );
}
