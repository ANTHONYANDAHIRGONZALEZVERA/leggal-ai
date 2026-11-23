import { iniciarSesion } from '@/features/auth/api';
import { solicitarAcceso } from '@/features/empresas/api';
import { leerCarga } from '@/services/api/jwt';
import { reiniciarMock, USUARIO_NUEVO } from '@/services/api/mock';
import { CODIGOS_DE_PRUEBA } from '@/services/api/mock-empresas';
import { useSesion } from '@/services/sesion';

import { useBorradorOnboarding } from '../borrador';
import { enviarOnboarding, necesitaEspacioPersonal } from '../envio';
import type { PreferenciasValidadas } from '../esquemas';

// Envío final del onboarding (F31 con B34 y B35), contra la API simulada.

const PREFERENCIAS: PreferenciasValidadas = {
  usos: ['resumir_documentos'],
  canal: 'ambos',
  notificaciones: { plazos: true, resumenDiario: false },
};

beforeEach(async () => {
  reiniciarMock();
  const borrador = useBorradorOnboarding.getState();
  borrador.vaciar();
  borrador.guardarPerfil({ nombre: 'Andrea Ruiz', usuario: 'andrea.r' });
  borrador.guardarArea({ rol: 'abogado', materias: ['laboral'], matricula: '17-2015-123' });
  useSesion.getState().iniciar(await iniciarSesion({ correo: USUARIO_NUEVO.correo, contrasena: USUARIO_NUEVO.contrasena }));
});

const tid = () => leerCarga(useSesion.getState().tokens!.acceso)?.tid;

describe('necesitaEspacioPersonal', () => {
  test.each([
    ['modo Personal', { modo: 'personal', empresaCreada: false, solicitudAprobada: false }, true],
    ['Colaborativo que creó su empresa', { modo: 'colaborativo', empresaCreada: true, solicitudAprobada: false }, false],
    ['Colaborativo ya aprobado en una empresa', { modo: 'colaborativo', empresaCreada: false, solicitudAprobada: true }, false],
    ['Colaborativo esperando aprobación', { modo: 'colaborativo', empresaCreada: false, solicitudAprobada: false }, true],
  ] as const)('%s → %s', (_caso, datos, esperado) => {
    expect(necesitaEspacioPersonal(datos)).toBe(esperado);
  });
});

describe('enviarOnboarding', () => {
  test('en modo Personal crea el espacio personal, envía todo y deja el onboarding completo', async () => {
    useBorradorOnboarding.getState().guardarModo('personal');

    await enviarOnboarding(PREFERENCIAS);

    expect(useSesion.getState().usuario).toMatchObject({
      nombreVisible: 'Andrea Ruiz',
      nombreUsuario: 'andrea.r',
      onboardingCompleto: true,
    });
    expect(tid()).toMatch(/^esp-/);
    // El borrador se vacía: ya está todo en el servidor.
    expect(useBorradorOnboarding.getState().perfil).toBeNull();
  });

  test('Colaborativo con una solicitud pendiente también recibe su espacio personal', async () => {
    const borrador = useBorradorOnboarding.getState();
    borrador.guardarModo('colaborativo');
    borrador.guardarSolicitud(await solicitarAcceso(CODIGOS_DE_PRUEBA.accons));

    await enviarOnboarding(PREFERENCIAS);

    expect(tid()).toMatch(/^esp-/);
    expect(useSesion.getState().usuario?.onboardingCompleto).toBe(true);
  });

  test('Colaborativo que creó su empresa no recibe espacio personal (sigue en su empresa)', async () => {
    const borrador = useBorradorOnboarding.getState();
    borrador.guardarModo('colaborativo');
    borrador.guardarEmpresa({ id: 'emp-x', nombre: 'Estudio Ruiz', verificada: false });

    await enviarOnboarding(PREFERENCIAS);

    expect(tid()).toBeNull();
    expect(useSesion.getState().usuario?.onboardingCompleto).toBe(true);
  });

  test('si otra persona tomó el @usuario, falla con su mensaje y no pierde el borrador', async () => {
    const borrador = useBorradorOnboarding.getState();
    borrador.guardarModo('personal');
    borrador.guardarPerfil({ nombre: 'Andrea Ruiz', usuario: 'andrea.ruiz' }); // ya tomado en la API simulada

    await expect(enviarOnboarding(PREFERENCIAS)).rejects.toMatchObject({
      codigo: 'USUARIO_EN_USO',
      message: 'Otra persona acaba de tomar tu nombre de usuario. Vuelve al paso 1 y elige otro.',
    });
    expect(useSesion.getState().usuario?.onboardingCompleto).toBe(false);
    expect(useBorradorOnboarding.getState().perfil).not.toBeNull();
  });

  test('reintentar después de un fallo no crea un segundo espacio personal', async () => {
    const borrador = useBorradorOnboarding.getState();
    borrador.guardarModo('personal');
    borrador.guardarPerfil({ nombre: 'Andrea Ruiz', usuario: 'andrea.ruiz' });
    await enviarOnboarding(PREFERENCIAS).catch(() => undefined);
    const primero = tid();

    borrador.guardarPerfil({ nombre: 'Andrea Ruiz', usuario: 'andrea.r' });
    await enviarOnboarding(PREFERENCIAS);

    expect(tid()).toBe(primero);
  });

  test('sin los pasos anteriores no envía nada', async () => {
    useBorradorOnboarding.getState().vaciar();

    await expect(enviarOnboarding(PREFERENCIAS)).rejects.toThrow('Faltan pasos del onboarding');
  });
});
