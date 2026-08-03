import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

/**
 * `useForm` pre-wired with a zod schema. Form values (and their types) are
 * inferred from the schema — one source of truth for validation + types.
 *
 * İki tip var ve ikisi de gerçek: alanlar şemanın GİRDİ tipini taşır (kullanıcı
 * ham metin yazar), `handleSubmit` ise resolver'ın ÇIKTI tipini verir
 * (`transform`'lu alanlar — telefon E.164'e, kullanıcı adı küçük harfe
 * çevrilmiş olarak gelir). Önceden ikisi de `z.input` olarak yazılıyordu, yani
 * normalizasyonun gerçekleştiği tip düzeyinde garanti DEĞİLDİ; `transform`'lu
 * bir alanı gönderim yolunda ham hâliyle kullanmak derleyiciden geçiyordu.
 */
export function useZodForm<Schema extends z.ZodType>(
  schema: Schema,
  options?: Omit<UseFormProps<z.input<Schema>>, 'resolver'>,
): UseFormReturn<z.input<Schema>, unknown, z.output<Schema>> {
  return useForm<z.input<Schema>, unknown, z.output<Schema>>({
    ...options,
    resolver: zodResolver(schema) as never,
  });
}
