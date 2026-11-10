import { emergencyNumber } from '../emergency';

describe('emergencyNumber', () => {
  it('gives 112 in Türkiye and Europe', () => {
    expect(emergencyNumber('TR')).toBe('112');
    expect(emergencyNumber('DE')).toBe('112');
    expect(emergencyNumber('es')).toBe('112');
    expect(emergencyNumber('CH')).toBe('112');
  });

  it('gives the number people know first elsewhere', () => {
    expect(emergencyNumber('US')).toBe('911');
    expect(emergencyNumber('CA')).toBe('911');
    expect(emergencyNumber('GB')).toBe('999');
    expect(emergencyNumber('AU')).toBe('000');
    expect(emergencyNumber('NZ')).toBe('111');
  });

  it('gives nothing when the region is unknown or not set', () => {
    expect(emergencyNumber('JP')).toBeNull();
    expect(emergencyNumber('')).toBeNull();
    expect(emergencyNumber(null)).toBeNull();
    expect(emergencyNumber(undefined)).toBeNull();
  });
});
