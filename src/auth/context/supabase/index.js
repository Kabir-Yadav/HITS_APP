import { supabase } from 'src/lib/supabase';

export * from './action';

export * from './auth-provider';

export async function signUp({ email, password, firstName, lastName, role, dateOfBirth }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        firstName,
        lastName,
        role,
        dateOfBirth: dateOfBirth || null,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
