import { FormProvider as RHFForm } from 'react-hook-form';

// ----------------------------------------------------------------------

export function FormProvider({ children, onSubmit, methods }) {
  return (
    <RHFForm {...methods}>
      <form onSubmit={onSubmit} noValidate autoComplete="off">
        {children}
      </form>
    </RHFForm>
  );
}
