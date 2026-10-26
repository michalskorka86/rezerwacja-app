import assert from 'node:assert/strict';
import { test } from 'node:test';

import { adresSms, TRESC_SMS_POTWIERDZENIA } from '../src/logika/sms';

test('SMS potwierdzenia: numer bez spacji, treść zakodowana, bez numeru — null', () => {
  const a = adresSms('+48 501 234-567', TRESC_SMS_POTWIERDZENIA);
  assert.ok(a?.startsWith('sms:+48501234567?body=Dzi%C4%99kuj%C4%99'));
  assert.equal(decodeURIComponent(a!.split('body=')[1]), TRESC_SMS_POTWIERDZENIA);
  assert.equal(adresSms('', 'x'), null);
  assert.equal(adresSms(null, 'x'), null);
});
