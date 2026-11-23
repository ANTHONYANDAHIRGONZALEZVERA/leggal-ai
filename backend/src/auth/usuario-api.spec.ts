import type { Usuario } from '../generated/prisma/client';
import { aUsuarioApi } from './usuario-api';

const base: Usuario = {
  id: '8f1c2d7a-3b4e-4f6a-9c1d-2e3f4a5b6c7d',
  correo: 'andrea.ruiz@ejemplo.com',
  hashContrasena: '$argon2id$v=19$secreto',
  nombre: 'Andrea Ruiz Mora',
  nombreVisible: null,
  nombreUsuario: null,
  correoVerificadoEn: null,
  onboardingCompletoEn: null,
  estado: 'activo',
  ultimaEmpresaId: null,
  creadoEn: new Date('2026-11-17T14:05:00.000Z'),
  actualizadoEn: new Date('2026-11-17T14:05:00.000Z'),
};

describe('aUsuarioApi', () => {
  it('devuelve exactamente los 8 campos del contrato', () => {
    expect(aUsuarioApi(base)).toEqual({
      id: base.id,
      nombre: 'Andrea Ruiz Mora',
      nombreVisible: null,
      nombreUsuario: null,
      correo: 'andrea.ruiz@ejemplo.com',
      correoVerificado: false,
      onboardingCompleto: false,
      creadoEn: '2026-11-17T14:05:00.000Z',
    });
  });

  it('nunca expone el hash de la contraseña ni el estado', () => {
    const json = JSON.stringify(aUsuarioApi(base));
    expect(json).not.toContain('argon2');
    expect(json).not.toContain('estado');
  });

  it('convierte las fechas de verificación y onboarding en booleanos', () => {
    const usuario = aUsuarioApi({
      ...base,
      correoVerificadoEn: new Date(),
      onboardingCompletoEn: new Date(),
    });
    expect(usuario.correoVerificado).toBe(true);
    expect(usuario.onboardingCompleto).toBe(true);
  });
});
