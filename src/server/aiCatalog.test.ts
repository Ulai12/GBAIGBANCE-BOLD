import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  catalogDateWindow,
  haversineKm,
  sanitizeSearchTerm,
  ticketStatusLabel,
  withinRadius,
} from './aiCatalog.ts';

const wednesday = new Date('2026-11-11T12:00:00.000Z');

describe('sanitizeSearchTerm', () => {
  it('neutralise une injection de filtre PostgREST', () => {
    const safe = sanitizeSearchTerm('concert,id.eq.00000000-0000-0000-0000-000000000000');
    assert.equal(safe.includes(','), false);
    assert.equal(safe.includes('.'), false);
    assert.match(safe, /concert/);
  });

  it('coupe à 60 caractères', () => {
    assert.equal(sanitizeSearchTerm('a'.repeat(80)).length, 60);
  });
});

describe('catalogDateWindow', () => {
  it('borne aujourd’hui au jour UTC courant', () => {
    const window = catalogDateWindow('today', wednesday);
    assert.equal(window.from, '2026-11-11T00:00:00.000Z');
    assert.equal(window.to, '2026-11-11T23:59:59.999Z');
  });

  it('place le week-end du mercredi sur samedi et dimanche', () => {
    const window = catalogDateWindow('this_weekend', wednesday);
    assert.equal(window.from, '2026-11-14T00:00:00.000Z');
    assert.equal(window.to, '2026-11-15T23:59:59.999Z');
  });

  it('laisse les sorties à venir ouvertes', () => {
    const window = catalogDateWindow('upcoming', wednesday);
    assert.equal(window.from, wednesday.toISOString());
    assert.equal(window.to, null);
  });
});

describe('ticketStatusLabel', () => {
  it('nomme les statuts réels et ignore l’ancien active', () => {
    assert.equal(ticketStatusLabel('valid'), 'Valide');
    assert.equal(ticketStatusLabel('used'), 'Utilisé');
    assert.equal(ticketStatusLabel('pending'), 'En attente de paiement');
    assert.equal(ticketStatusLabel('active'), 'active');
  });
});
describe('withinRadius', () => {
  it('garde Lomé et écarte Accra', () => {
    const rows = withinRadius(
      [
        { id: 'lome', latitude: 6.17, longitude: 1.23 },
        { id: 'accra', latitude: 5.6, longitude: -0.19 },
      ],
      6.1375,
      1.2123,
      15,
      8,
    );
    assert.deepEqual(rows.map((row) => row.id), ['lome']);
    assert.ok(rows[0].distance_km < 15);
  });

  it('mesure une distance courte autour de Lomé', () => {
    const km = haversineKm(6.1375, 1.2123, 6.17, 1.23);
    assert.ok(km > 0 && km < 10);
  });
});
