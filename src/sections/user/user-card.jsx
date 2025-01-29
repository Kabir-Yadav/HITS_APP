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
  // Generate random numbers for fallback images
  const randomAvatar = Math.floor(Math.random() * 24) + 1;
  const randomCover = Math.floor(Math.random() * 24) + 1;

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
        <AvatarShape
          sx={{
            left: 0,
            right: 0,
            zIndex: 10,
            mx: 'auto',
            bottom: -26,
            position: 'absolute',
          }}
        />

        <Avatar
          alt={user.name}
          src={user.avatarUrl || _mock.image.avatar(randomAvatar)}
          sx={{
            left: 0,
            right: 0,
            width: 80,
            height: 80,
            zIndex: 11,
            mx: 'auto',
            bottom: -40,
            position: 'absolute',
            border: (theme) => `solid 4px ${theme.palette.background.paper}`,
          }}
        />

        <Image
          src={user.coverUrl || _mock.image.cover(randomCover)}
          alt="cover"
          ratio="16/9"
          overlay={false}
          sx={{
            filter: 'brightness(0.8)',
            backgroundColor: 'grey.500',
            height: '100%',
            width: '100%',
            objectFit: 'cover',
          }}
        />
      </Box>

      <Box sx={{ 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        pt: 5,
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
