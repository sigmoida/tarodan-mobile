/**
 * Fatura / e-Arşiv PDF adresi açılmadan önce: yalnız https + izinli host.
 */
import { isTrustedDocumentUrl } from '../trustedDocumentUrl';

const PRESIGNED =
  'https://amzn-tarodan.s3.eu-west-1.amazonaws.com/documents/invoices/inv-1.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc';

describe('isTrustedDocumentUrl', () => {
  it.each([
    ['S3 presigned (sanal-host stili)', PRESIGNED],
    ['S3 yol-stili, bizim kova', 'https://s3.eu-west-1.amazonaws.com/amzn-tarodan/documents/inv.pdf?X-Amz-Signature=x'],
    ['kendi web sitemiz', 'https://tarodan.com.tr/invoices/inv.pdf'],
    ['büyük harfli şema/host', 'HTTPS://AMZN-TARODAN.S3.EU-WEST-1.AMAZONAWS.COM/documents/a.pdf'],
  ])('kabul: %s', (_n, url) => {
    expect(isTrustedDocumentUrl(url)).toBe(true);
  });

  it.each([
    ['http', 'http://amzn-tarodan.s3.eu-west-1.amazonaws.com/documents/a.pdf'],
    ['javascript:', 'javascript:alert(1)'],
    ['intent:', 'intent://x#Intent;scheme=http;end'],
    ['data:', 'data:application/pdf;base64,AAAA'],
    ['yabancı host', 'https://evil.example/invoice.pdf'],
    ['benzer host (sonek)', 'https://amzn-tarodan.s3.eu-west-1.amazonaws.com.evil.example/a.pdf'],
    ['userinfo ile host kandırma', 'https://amzn-tarodan.s3.eu-west-1.amazonaws.com@evil.example/a.pdf'],
    ['yol-stili başka kova', 'https://s3.eu-west-1.amazonaws.com/attacker-bucket/a.pdf'],
    ['yol-stili .. ile kaçış', 'https://s3.eu-west-1.amazonaws.com/amzn-tarodan/../attacker-bucket/a.pdf'],
    ['yol-stili kodlanmış kaçış', 'https://s3.eu-west-1.amazonaws.com/amzn-tarodan/%2e%2e/attacker/a.pdf'],
    ['protokol-göreli', '//evil.example/a.pdf'],
    ['boş', ''],
    ['metin değil', 42],
  ])('ret: %s', (_n, url) => {
    expect(isTrustedDocumentUrl(url)).toBe(false);
  });
});
