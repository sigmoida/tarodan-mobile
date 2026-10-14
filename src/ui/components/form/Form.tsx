import React from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { Input, type InputProps } from '../Input';
import { Alert } from '../Alert';

/**
 * RHF-connected form primitives for React Native. Pair with `useZodForm`:
 *
 *   const form = useZodForm(schema);
 *   <Form form={form}>
 *     <FormError />
 *     <FormInput name="email" label="E-posta" />
 *     <Button onPress={form.handleSubmit(handle)} isLoading={form.formState.isSubmitting}>
 *       Gönder
 *     </Button>
 *   </Form>
 *
 * RN has no <form> element, so submission is triggered by the caller via
 * `form.handleSubmit`. Fields bind through Controller (RN inputs are controlled).
 */
export function Form<T extends FieldValues, TTransformed = T>({
  form,
  children,
}: {
  /**
   * `useZodForm` artık şemanın ÇIKTI tipini üçüncü generic'te taşıyor
   * (`handleSubmit` transform'lu değerleri verir). `Form` bu tipi yalnız
   * geçirir, kullanmaz — sabit `UseFormReturn<T>` yazmak transform'lu her
   * formu buraya bağlanamaz hâle getiriyordu.
   */
  form: UseFormReturn<T, unknown, TTransformed>;
  children: React.ReactNode;
}) {
  // Wrap in a fragment: react-hook-form's FormProvider is typed against React
  // 18's ReactNode, while ui-native uses React 19 types (which add `bigint`).
  return (
    <FormProvider {...form}>
      <>{children}</>
    </FormProvider>
  );
}

export interface FormInputProps
  extends Omit<InputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> {
  /** Field name in the form schema. */
  name: string;
  /**
   * Normalise each keystroke before it reaches the form state, e.g.
   * `transform={(t) => t.toLowerCase()}` for a username field. Keeps what the
   * user sees identical to what gets submitted — a schema-level transform would
   * change the value silently after the fact.
   */
  transform?: (text: string) => string;
}

/** Text input wired to the form by `name` via Controller. */
export function FormInput({ name, transform, ...props }: FormInputProps) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...props}
          value={field.value ?? ''}
          onChangeText={transform ? (t) => field.onChange(transform(t)) : field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

/** Form-level error — shows the RHF `root` error (e.g. a server error) in the shared `Alert` (danger). */
export function FormError() {
  const { formState } = useFormContext();
  const message = formState.errors.root?.message as string | undefined;
  if (!message) return null;
  return (
    <Alert variant="danger" testID="form-error">
      {message}
    </Alert>
  );
}
