import type { RespuestaSesionApi, UsuarioApi } from '@/services/api/contrato';

// Solo para pruebas: datos con la forma exacta del contrato B03, para no
// repetir el objeto usuario completo en cada archivo.

export function usuarioDePrueba(cambios: Partial<UsuarioApi> = {}): UsuarioApi {
  return {
    id: 'u1',
    nombre: 'Ana Pérez',
    nombreVisible: null,
    nombreUsuario: null,
    correo: 'ana@empresa.com',
    correoVerificado: true,
    onboardingCompleto: true,
    creadoEn: '2026-11-11T00:00:00.000Z',
    ...cambios,
  };
}

export function sesionDePrueba(
  cambios: Partial<Omit<RespuestaSesionApi, 'usuario'>> & { usuario?: Partial<UsuarioApi> } = {},
): RespuestaSesionApi {
  const { usuario, ...resto } = cambios;
  return {
    tokenAcceso: 'acceso-1',
    tokenRefresco: 'renovacion-1',
    venceEn: 900,
    ...resto,
    usuario: usuarioDePrueba(usuario),
  };
}
