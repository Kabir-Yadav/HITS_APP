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

import { _contacts } from 'src/_mock';
import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { SearchNotFound } from 'src/components/search-not-found';

// ----------------------------------------------------------------------

const ITEM_HEIGHT = 64;

export function KanbanContactsDialog({ assignee = [], open, onClose, onAssignee }) {
  const [searchContact, setSearchContact] = useState('');
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name');

      if (!error) {
        setContacts(data);
      }
    };

    if (open) {
      fetchContacts();
    }
  }, [open]);

  const handleSearchContacts = useCallback((event) => {
    setSearchContact(event.target.value);
  }, []);

  const handleAssignContact = useCallback(
    (contact) => {
      const isAssigned = assignee.map((person) => person.id).includes(contact.id);

      if (isAssigned) {
        onAssignee(assignee.filter((person) => person.id !== contact.id));
      } else {
        onAssignee([...assignee, contact]);
      }
    },
    [assignee, onAssignee]
  );

  const dataFiltered = applyFilter({ inputData: contacts, query: searchContact });

  const notFound = !dataFiltered.length && !!searchContact;

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <DialogTitle sx={{ pb: 0 }}>
        Contacts <Typography component="span">({_contacts.length})</Typography>
      </DialogTitle>

      <Box sx={{ px: 3, py: 2.5 }}>
        <TextField
          fullWidth
          value={searchContact}
          onChange={handleSearchContacts}
          placeholder="Search..."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {notFound ? (
          <SearchNotFound query={searchContact} sx={{ mt: 3, mb: 10 }} />
        ) : (
          <Scrollbar sx={{ px: 2.5, height: 'auto', maxHeight: 400 }}>
            <Box component="ul" sx={{ py: 1 }}>
              {dataFiltered.map((contact) => {
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
                    <Box>
                      <Typography variant="subtitle2">{contact.full_name}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {contact.email}
                      </Typography>
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
              })}
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
    ({ full_name, email }) =>
      full_name?.toLowerCase().includes(query.toLowerCase()) ||
      email?.toLowerCase().includes(query.toLowerCase())
  );
}
