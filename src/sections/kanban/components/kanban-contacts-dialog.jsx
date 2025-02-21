import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { SearchNotFound } from 'src/components/search-not-found';

// ----------------------------------------------------------------------

const ITEM_HEIGHT = 64;

// Helper function to format name from email
const formatNameFromEmail = (email) => {
  // Extract the name part before @f13.tech
  const namePart = email.split('@')[0];
  // Split by dot and capitalize each part
  return namePart
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export function KanbanContactsDialog({ assignee = [], open, onClose, onAssignee }) {
  const [searchContact, setSearchContact] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleSearchContacts = useCallback((event) => {
    setSearchContact(event.target.value);
  }, []);

  // Fetch contacts from database
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, email, avatar_url')
          .order('email');

        if (error) throw error;

        setContacts(data.map(user => ({
          id: user.id,
          name: formatNameFromEmail(user.email), // Format name from email
          email: user.email,
          avatarUrl: user.avatar_url,
        })));
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchContacts();
    }
  }, [open]);

  const handleAssignContact = useCallback((contact) => {
    const isAssigned = assignee.map((person) => person.id).includes(contact.id);
    
    if (isAssigned) {
      // Remove assignee
      onAssignee(assignee.filter((person) => person.id !== contact.id));
    } else {
      // Add assignee
      onAssignee([...assignee, contact]);
    }
  }, [assignee, onAssignee]);

  const dataFiltered = applyFilter({ inputData: contacts, query: searchContact });

  const notFound = !dataFiltered.length && !!searchContact;
  const displayLoading = loading && !contacts.length;

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <DialogTitle sx={{ pb: 0 }}>
        Contacts <Typography component="span">({contacts.length})</Typography>
      </DialogTitle>

      <Box sx={{ px: 3, py: 2.5 }}>
        <TextField
          fullWidth
          value={searchContact}
          onChange={handleSearchContacts}
          placeholder="Search..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {notFound ? (
          <SearchNotFound query={searchContact} sx={{ mt: 3, mb: 10 }} />
        ) : (
          <Scrollbar sx={{ px: 2.5, height: 'auto', maxHeight: 400 }}>
            <Box component="ul" sx={{ py: 1 }}>
              {displayLoading ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Loading...
                  </Typography>
                </Box>
              ) : (
                dataFiltered.map((contact) => {
                  const checked = assignee.map((person) => person.id).includes(contact.id);

                  return (
                    <Box
                      component="li"
                      key={contact.id}
                      sx={{
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 1,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          alt={contact.name}
                          src={contact.avatarUrl}
                          sx={{ width: 36, height: 36 }}
                        >
                          {contact.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{contact.name}</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {contact.email}
                          </Typography>
                        </Box>
                      </Box>

                      <Button
                        size="small"
                        color={checked ? 'primary' : 'inherit'}
                        onClick={() => handleAssignContact(contact)}
                        startIcon={
                          <Iconify
                            width={16}
                            icon={checked ? 'eva:checkmark-fill' : 'mingcute:add-line'}
                            sx={{ mr: -0.5 }}
                          />
                        }
                      >
                        {checked ? 'Assigned' : 'Assign'}
                      </Button>
                    </Box>
                  );
                })
              )}
            </Box>
          </Scrollbar>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, query }) {
  if (!query) return inputData;

  return inputData.filter(
    ({ name, email }) =>
      name.toLowerCase().includes(query.toLowerCase()) ||
      email.toLowerCase().includes(query.toLowerCase())
  );
}
