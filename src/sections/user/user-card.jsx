import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { fShortenNumber } from 'src/utils/format-number';

import { _mock } from 'src/_mock';
import { _socials } from 'src/_mock';
import { AvatarShape } from 'src/assets/illustrations';
import { TwitterIcon, FacebookIcon, LinkedinIcon, InstagramIcon } from 'src/assets/icons';

import { Image } from 'src/components/image';

// ----------------------------------------------------------------------

export function UserCard({ user, sx, ...other }) {
  return (
    <Card 
      sx={[
        { 
          textAlign: 'center',
          maxWidth: 600,
          mx: 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }, 
        ...(Array.isArray(sx) ? sx : [sx])
      ]} 
      {...other}
    >
      <Box sx={{ position: 'relative', height: 320 }}>
        <Image
          src={user.coverUrl}
          alt="cover"
          ratio="16/9"
          overlay={false}
          sx={{
            backgroundColor: 'background.paper',
            height: '100%',
            width: '100%',
            objectFit: 'contain',
            p: 2,
          }}
        />
      </Box>

      <Box sx={{ 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        pt: 3,
        pb: 3,
      }}>
        <ListItemText
          sx={{ mb: 2 }}
          primary={user.quoteAuthor}
          slotProps={{
            primary: { 
              sx: { 
                typography: 'h6',
                fontSize: 24,
              }
            },
          }}
        />

        <Box sx={{ px: 3 }}>
          <Typography 
            variant="body1"
            sx={{ 
              fontStyle: 'italic', 
              color: 'text.secondary',
              fontSize: '1.5rem',
              lineHeight: 1.6,
            }}
          >
            &ldquo;{user.quote}&rdquo;
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
