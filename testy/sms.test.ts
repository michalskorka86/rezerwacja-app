import assert from 'node:assert/strict';
import { test } from 'node:test';

import { adresSms, trescSmsPotwierdzenia } from '../src/logika/sms';

test('SMS potwierdzenia: numer bez spacji, treść zakodowana, bez numeru — null', () => {
  const t = trescSmsPotwierdzenia({ marka: 'silt', lokalizacja: 'silt' });
  const a = adresSms('+48 501 234-567', t);
  assert.ok(a?.startsWith('sms:+48501234567?body=Dzi%C4%99kuj%C4%99'));
  assert.equal(decodeURIComponent(a!.split('body=')[1]), t);
  assert.ok(t.endsWith('Pozdrawiam serdecznie Kuba SILT Paintball & ASG.'));
  assert.equal(adresSms('', 'x'), null);
  assert.equal(adresSms(null, 'x'), null);
});

test('SMS potwierdzenia Arsenału: link do pola wg lokalizacji i podpis Pawła', () => {
  const rem = trescSmsPotwierdzenia({ marka: 'arsenal', lokalizacja: 'rembert' });
  const wol = trescSmsPotwierdzenia({ marka: 'arsenal', lokalizacja: 'wolomin' });
  assert.ok(rem.includes('Lokalizacja pola: https://maps.app.goo.gl/RpSe5EiiZUAXUjxs5'));
  assert.ok(wol.includes('Lokalizacja pola: https://maps.app.goo.gl/zXBoVDCzrsSiesdE8'));
  assert.ok(rem.endsWith('Pozdrawiam serdecznie Paweł Arsenał Paintball.') && !rem.includes('Kuba'));
});
