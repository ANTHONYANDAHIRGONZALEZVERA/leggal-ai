import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import Inicio from '@/app/(tabs)/inicio';
import { DURACION_AVISO_MS } from '@/components/aviso-flotante';
import { iniciarSesion } from '@/features/auth/api';
import { crearEmpresa, solicitarAcceso } from '@/features/empresas/api';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { enviarOnboarding } from '@/features/onboarding/envio';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock, USUARIO_DEMO, USUARIO_NUEVO } from '@/services/api/mock';
import { CODIGOS_DE_PRUEBA } from '@/services/api/mock-empresas';
import { useSesion } from '@/services/sesion';

import { DESCRIPCION_SUGERENCIAS } from '../sugerencias-asistente';

jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('@/components/esfera', () => ({ Esfera: () => null }));
jest.mock('@/components/ondas', () => ({ Ondas: () => null }));
jest.mock('@/components/anillo', () => ({ Anillo: () => null }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));

const PREFERENCIAS = { usos: ['resumir_documentos' as const], canal: 'ambos' as const, notificaciones: { plazos: false, resumenDiario: false } };

beforeEach(() => {
  jest.clearAllMocks();
  reiniciarMock();
  useBorradorOnboarding.getState().vaciar();
});

async function entrar(cuenta: { correo: string; contrasena: string }) {
  useSesion.getState().iniciar(await iniciarSesion({ correo: cuenta.correo, contrasena: cuenta.contrasena }));
}

/** Cuenta nueva que termina el onboarding como Andrea Ruiz, en el modo dado. */
async function terminarOnboarding(modo: 'personal' | 'colaborativo') {
  await entrar(USUARIO_NUEVO);
  const borrador = useBorradorOnboarding.getState();
  borrador.guardarPerfil({ nombre: 'Andrea Ruiz', usuario: 'andrea.r' });
  borrador.guardarArea({ rol: 'abogado', materias: [], matricula: null });
  borrador.guardarModo(modo);
}

const selector = () => screen.getByRole('button', { name: /^Leggal AI, espacio/ });

// Inicio (F12): encabezado con el espacio activo, saludo y asistente.
describe('Inicio', () => {
  test('saluda por el primer nombre y muestra sus iniciales', async () => {
    await entrar(USUARIO_DEMO);
    await renderizar(<Inicio />);

    expect(screen.getByRole('header', { name: 'Hola, Usuario' })).toBeOnTheScreen();
    expect(screen.getByText('UD')).toBeOnTheScreen();
    expect(screen.getByText('¿En qué proceso trabajamos hoy?')).toBeOnTheScreen();
  });

  test('mientras carga el espacio lo dice, y luego muestra la empresa activa', async () => {
    await entrar(USUARIO_DEMO);
    await renderizar(<Inicio />);

    expect(screen.getByRole('button', { name: 'Leggal AI, cargando tu espacio' })).toBeOnTheScreen();
    expect(await screen.findByText('ACCONS S.A.S.')).toBeOnTheScreen();
    expect(screen.getByText('Personalizado para tu despacho')).toBeOnTheScreen();
  });

  test('en modo Personal muestra su espacio personal y "para ti"', async () => {
    await terminarOnboarding('personal');
    await enviarOnboarding(PREFERENCIAS);
    await renderizar(<Inicio />);

    expect(await screen.findByText('Espacio personal')).toBeOnTheScreen();
    expect(screen.getByText('Personalizado para ti')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Hola, Andrea' })).toBeOnTheScreen();
    expect(screen.getByText('AR')).toBeOnTheScreen();
  });

  test('si creó su empresa, muestra esa empresa', async () => {
    await terminarOnboarding('colaborativo');
    const creada = await crearEmpresa({ razonSocial: 'Estudio Ruiz', ruc: '1790099999001', tamanoEquipo: '1-5' });
    useSesion.getState().iniciar(creada);
    useBorradorOnboarding.getState().guardarEmpresa(creada.empresa);
    await enviarOnboarding(PREFERENCIAS);
    await renderizar(<Inicio />);

    expect(await screen.findByText('Estudio Ruiz')).toBeOnTheScreen();
    expect(screen.getByText('Personalizado para tu despacho')).toBeOnTheScreen();
  });

  test('si su solicitud sigue pendiente, trabaja en su espacio personal (no en la empresa)', async () => {
    await terminarOnboarding('colaborativo');
    useBorradorOnboarding.getState().guardarSolicitud(await solicitarAcceso(CODIGOS_DE_PRUEBA.accons));
    await enviarOnboarding(PREFERENCIAS);
    await renderizar(<Inicio />);

    expect(await screen.findByText('Espacio personal')).toBeOnTheScreen();
    expect(screen.queryByText('ACCONS S.A.S.')).not.toBeOnTheScreen();
  });

  test('si entró directo con un código sin aprobación, muestra esa empresa', async () => {
    await terminarOnboarding('colaborativo');
    useBorradorOnboarding.getState().guardarSolicitud(await solicitarAcceso(CODIGOS_DE_PRUEBA.directo));
    await enviarOnboarding(PREFERENCIAS);
    await renderizar(<Inicio />);

    expect(await screen.findByText('Consultora Jurídica Andina')).toBeOnTheScreen();
  });

  test.each([
    ['el selector de espacio', () => selector(), 'Cambiar de espacio llega pronto'],
    ['la lupa', () => screen.getByRole('button', { name: 'Buscar' }), 'La búsqueda llega pronto'],
    ['la campana', () => screen.getByRole('button', { name: 'Notificaciones' }), 'Las notificaciones llegan pronto'],
  ])('%s avisa que llega pronto', async (_que, boton, mensaje) => {
    await entrar(USUARIO_DEMO);
    const user = userEvent.setup();
    await renderizar(<Inicio />);
    await screen.findByText('ACCONS S.A.S.');

    await user.press(boton());

    expect(await screen.findByText(mensaje)).toBeOnTheScreen();
  });

  test('el aviso se va solo', async () => {
    await entrar(USUARIO_DEMO);
    await renderizar(<Inicio />);
    await screen.findByText('ACCONS S.A.S.');
    // Relojes simulados recién aquí: la API simulada también usa setTimeout.
    jest.useFakeTimers();
    try {
      await fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));
      expect(screen.getByText('La búsqueda llega pronto')).toBeOnTheScreen();

      await act(() => jest.advanceTimersByTime(DURACION_AVISO_MS));

      expect(screen.queryByText('La búsqueda llega pronto')).not.toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  test('el avatar lleva a Más (perfil y cuenta)', async () => {
    await entrar(USUARIO_DEMO);
    const user = userEvent.setup();
    await renderizar(<Inicio />);

    await user.press(screen.getByRole('button', { name: 'Mi perfil y cuenta' }));

    expect(router.navigate).toHaveBeenCalledWith('/mas');
  });

  test('el asistente se ve pero no se puede tocar todavía', async () => {
    await entrar(USUARIO_DEMO);
    await renderizar(<Inicio />);

    expect(screen.getByLabelText(DESCRIPCION_SUGERENCIAS)).toBeOnTheScreen();
    expect(screen.getByLabelText('Pregunta sobre tus casos. El asistente estará disponible pronto.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Resume este contrato/ })).not.toBeOnTheScreen();
    expect(screen.queryByText('Continuar chat')).not.toBeOnTheScreen(); // no hay chats reales que continuar
  });
});
