/**
 * `useZodForm` — girdi tipi ile çıktı tipi ayrı.
 *
 * Alanlar şemanın GİRDİ tipini taşır (kullanıcı ham metin yazar); `handleSubmit`
 * ise resolver'ın ÇIKTI tipini verir — `transform`'lu alanlar normalize edilmiş
 * gelir (telefon E.164, kullanıcı adı küçük harf). Hook her ikisini de
 * `z.input` olarak yazıyordu: normalizasyonun gerçekleştiği tip düzeyinde
 * garanti DEĞİLDİ, gönderim yolunda ham değeri kullanmak derleyiciden geçiyordu.
 *
 * Tipler derleme zamanında kontrol ediliyor (`tsc --noEmit` bu dosyayı da
 * görür); burada RUNTIME sözleşmesi kilitleniyor: submit gerçekten dönüştürülmüş
 * değeri alıyor mu?
 */
import { renderHook, act } from '@testing-library/react-native';
import { z } from 'zod';
import { useZodForm } from '../use-zod-form';

const schema = z.object({
  handle: z.string().trim().min(1).transform((v) => v.toLowerCase()),
  amount: z.string().transform((v) => Number(v)),
});

describe('useZodForm', () => {
  it('hands the submit handler the transformed values, not the raw input', async () => {
    const onValid = jest.fn();
    const { result } = renderHook(() =>
      useZodForm(schema, { defaultValues: { handle: '', amount: '' } }),
    );

    act(() => {
      result.current.setValue('handle', '  GorkemS  ');
      result.current.setValue('amount', '42');
    });
    await act(async () => {
      await result.current.handleSubmit(onValid)();
    });

    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid.mock.calls[0]![0]).toMatchObject({ handle: 'gorkems', amount: 42 });
  });

  it('keeps the raw text in the field state so the user sees what they typed', () => {
    const { result } = renderHook(() =>
      useZodForm(schema, { defaultValues: { handle: '', amount: '' } }),
    );

    act(() => {
      result.current.setValue('handle', 'GorkemS');
    });

    expect(result.current.getValues('handle')).toBe('GorkemS');
  });

  it('does not call the handler when the schema rejects', async () => {
    const onValid = jest.fn();
    const { result } = renderHook(() =>
      useZodForm(schema, { defaultValues: { handle: '', amount: '1' } }),
    );

    await act(async () => {
      await result.current.handleSubmit(onValid)();
    });

    expect(onValid).not.toHaveBeenCalled();
  });
});
