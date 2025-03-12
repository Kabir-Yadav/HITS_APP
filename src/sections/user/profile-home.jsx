import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { _mock } from 'src/_mock';
import { countries } from 'src/assets/data';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { UserCard } from './user-card';

// ----------------------------------------------------------------------

const DEFAULT_QUOTE = {
  content: 'The only way to do great work is to love what you do.',
  author: 'Steve Jobs',
};

const FALLBACK_QUOTES = [
  { content: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
  { content: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { content: 'Quality is not an act, it is a habit.', author: 'Aristotle' },
  { content: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
  { content: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { content: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
  { content: 'Everything you\'ve ever wanted is on the other side of fear.', author: 'George Addair' },
  { content: 'Success usually comes to those who are too busy to be looking for it.', author: 'Henry David Thoreau' },
  { content: 'The road to success and the road to failure are almost exactly the same.', author: 'Colin R. Davis' },
  { content: 'Opportunities don\'t happen. You create them.', author: 'Chris Grosser' },
  { content: 'I find that the harder I work, the more luck I seem to have.', author: 'Thomas Jefferson' },
  { content: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { content: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { content: 'The only limit to our realization of tomorrow will be our doubts of today.', author: 'Franklin D. Roosevelt' },
  { content: 'What you do today can improve all your tomorrows.', author: 'Ralph Marston' },
  { content: 'The only place where success comes before work is in the dictionary.', author: 'Vidal Sassoon' },
  { content: 'If you want to achieve greatness stop asking for permission.', author: 'Anonymous' },
  { content: 'Things work out best for those who make the best of how things work out.', author: 'John Wooden' },
  { content: 'To live a creative life, we must lose our fear of being wrong.', author: 'Joseph Chilton Pearce' },
  { content: 'If you are not willing to risk the usual you will have to settle for the ordinary.', author: 'Jim Rohn' },
];

export function ProfileHome({ info }) {
  const { user } = useAuthContext();
  const [quote, setQuote] = useState(DEFAULT_QUOTE.content);
  const [quoteAuthor, setQuoteAuthor] = useState(DEFAULT_QUOTE.author);
  
  // Remove randomAvatar, keep randomCover for now but we won't use it
  const [randomCover] = useState(() => Math.floor(Math.random() * 24) + 1);

  useEffect(() => {
    // Immediately show a random quote from our fallback list
    const randomIndex = Math.floor(Math.random() * FALLBACK_QUOTES.length);
    const randomQuote = FALLBACK_QUOTES[randomIndex];
    setQuote(randomQuote.content);
    setQuoteAuthor(randomQuote.author);

    // Then fetch from API with a timeout
    const fetchQuote = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const response = await fetch('https://api.quotable.io/random', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setQuote(data.content);
          setQuoteAuthor(data.author);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Quote fetch timed out, using fallback quote');
        } else {
          console.error('Error fetching quote:', error);
        }
        // Keep showing the random fallback quote we already set
      }
    };

    fetchQuote();
  }, []); // This will run on each mount

  const getCountryFromPhone = (phoneNumber) => {
    if (!phoneNumber) return null;
    
    // Remove any non-digit characters except +
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Find country by phone prefix
    const country = countries.find((c) => {
      const prefix = `+${c.phone}`;
      return cleanNumber.startsWith(prefix);
    });

    return country?.label || null;
  };

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Remove any non-digit characters except +
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Split into prefix and number
    const match = cleanNumber.match(/^(\+\d+)(\d{10})$/);
    if (!match) return phoneNumber;
    
    const [, prefix, number] = match;
    return (
      <Typography variant="body1">
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {prefix}
        </Box>
        {'  '}
        {number}
      </Typography>
    );
  };

  const renderBirthDate = () => (
    <Card sx={{ py: 3, textAlign: 'center' }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
          About
        </Typography>

        <Box
          sx={{
            width: 200,
            bgcolor: 'background.neutral',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: (theme) => theme.customShadows.z8,
          }}
        >
          {/* Month Header */}
          <Box
            sx={{
              py: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="h6">
              {info.dateOfBirth ? dayjs(info.dateOfBirth).format('MMMM') : '-'}
            </Typography>
          </Box>

          {/* Date Display */}
          <Stack
            spacing={1}
            sx={{
              p: 2,
              borderRadius: 1,
              position: 'relative',
            }}
          >
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 'bold',
                color: 'text.primary',
              }}
            >
              {info.dateOfBirth ? dayjs(info.dateOfBirth).format('DD') : '-'}
            </Typography>

            <Typography 
              variant="h4"
              sx={{ 
                color: 'text.secondary',
              }}
            >
              {info.dateOfBirth ? dayjs(info.dateOfBirth).format('YYYY') : '-'}
            </Typography>

            {/* Calendar Icon Overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: -24,
                right: -24,
                opacity: 0.12,
                transform: 'rotate(15deg)',
              }}
            >
              <Iconify
                icon="solar:calendar-bold"
                width={100}
                sx={{
                  color: 'text.disabled',
                }}
              />
            </Box>
          </Stack>
        </Box>

        {/* Age Display */}
        {info.dateOfBirth && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              mt: 2,
              fontStyle: 'italic',
            }}
          >
            {`${dayjs().diff(info.dateOfBirth, 'year')} years old`}
          </Typography>
        )}
      </Stack>
    </Card>
  );

  const renderContact = () => (
    <Card sx={{ py: 3, px: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Contact Information
        </Typography>

        {info.phoneNumber && (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Iconify 
              icon="solar:phone-bold" 
              width={24} 
              sx={{ color: 'primary.main' }}
            />
            {formatPhoneNumber(info.phoneNumber)}
          </Stack>
        )}

        {info.phoneNumber && getCountryFromPhone(info.phoneNumber) && (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Iconify 
              icon="mingcute:location-fill" 
              width={24} 
              sx={{ color: 'error.main' }}
            />
            <Typography variant="body1">
              {getCountryFromPhone(info.phoneNumber)}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Card>
  );

  // Get social links from user metadata
  const socialLinks = user?.user_metadata?.social_links || {
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
  };

  const userCardData = {
    name: `${info.firstName} ${info.lastName}`,
    designation: user?.user_metadata?.designation || '',
    role: info.role,
    coverUrl: '/assets/F13-logo-new.png',
    quote: quote,
    quoteAuthor: quoteAuthor,
    totalFollowers: 0,
    totalFollowing: 0,
    totalPosts: 0,
    socialLinks,
    hideAvatar: true, 
  };

  const renderSocialLinks = () => (
    <Card sx={{ py: 3, px: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Social Links
        </Typography>

        {Object.entries(socialLinks).map(([platform, url]) => {
          if (!url) return null;

          const icons = {
            facebook: 'eva:facebook-fill',
            instagram: 'ant-design:instagram-filled',
            linkedin: 'eva:linkedin-fill',
            twitter: 'eva:twitter-fill',
          };

          return (
            <Stack 
              key={platform} 
              direction="row" 
              alignItems="center" 
              spacing={2}
            >
              <Iconify 
                icon={icons[platform]} 
                width={24} 
                sx={{ 
                  color: {
                    facebook: '#1877F2',
                    instagram: '#E02D69',
                    linkedin: '#0A66C2',
                    twitter: '#1C9CEA',
                  }[platform] 
                }}
              />
              <Link 
                href={url} 
                target="_blank"
                rel="noopener"
                color="inherit"
                sx={{ 
                  typography: 'body1',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {url.replace(/^https?:\/\/(www\.)?/, '')}
              </Link>
            </Stack>
          );
        })}

        {!Object.values(socialLinks).some(Boolean) && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            No social links added yet
          </Typography>
        )}
      </Stack>
    </Card>
  );

  return (
    <Grid container spacing={3}>
      {/* First Column - Born On and Contact Info */}
      <Grid xs={12} md={3}>
        <Stack spacing={3}>
          {renderBirthDate()}
          {renderContact()}
        </Stack>
      </Grid>

      {/* Second Column - Quote Card */}
      <Grid xs={12} md={6}>
        <Box>
          <UserCard user={userCardData} />
        </Box>
      </Grid>

      {/* Third Column - Social Links */}
      <Grid xs={12} md={3}>
        {renderSocialLinks()}
      </Grid>
    </Grid>
  );
}
