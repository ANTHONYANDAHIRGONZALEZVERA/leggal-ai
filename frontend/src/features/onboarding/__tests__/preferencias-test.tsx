import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import Preferencias from '@/app/(onboarding)/preferencias';
import { iniciarSesion } from '@/features/auth/api';
import * as permiso from '@/features/notificaciones/permiso';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock, USUARIO_NUEVO } from '@/services/api/mock';
import { useSesion } from '@/services/sesion';

import { useBorradorOnboarding } from '../borrador';
import { esquemaPreferencias } from '../esquemas';

jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('@/components/esfera', () => ({ Esfera: () => null }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
    Redirect: ({ href }: { href: string }) => <Text>{`Redirige a ${href}`}</Text>,
  };
});
// El permiso del sistema se probó aparte (notificaciones/permiso-test).
jest.mock('@/features/notificaciones/permiso', () => ({
  consultarPermisoNotificaciones: jest.fn(),
  pedirPermisoNotificaciones: jest.fn(),
}));
const sistema = jest.mocked(permiso);

// Llega desde el 3/5 en modo Personal, con sesión real de la API simulada.
beforeEach(async () => {
  jest.clearAllMocks();
  reiniciarMock();
  const borrador = useBorradorOnboarding.getState();
  borrador.vaciar();
  borrador.guardarPerfil({ nombre: 'Andrea Ruiz', usuario: 'andrea.r' });
  borrador.guardarArea({ rol: 'abogado', materias: [], matricula: null });
  borrador.guardarModo('personal');
  useSesion.getState().iniciar(await iniciarSesion({ correo: USUARIO_NUEVO.correo, contrasena: USUARIO_NUEVO.contrasena }));
});

const uso = (titulo: string) => screen.getByRole('checkbox', { name: titulo });
const canal = (titulo: string) => screen.getByRole('radio', { name: titulo });
const aviso = (titulo: string) => screen.getByRole('switch', { name: titulo });
const empezar = () => screen.getByRole('button', { name: 'Empezar' });
/** Mueve el interruptor como lo haría el dedo (el Switch responde a valueChange, no a press). */
const mover = (titulo: string, encendido: boolean) => act(() => fireEvent(aviso(titulo), 'valueChange', encendido));

// Paso 5/5 "¿Para qué usarás Leggal AI?" (F31).
describe('Onboarding 5/5: ¿Para qué usarás Leggal AI?', () => {
  test('empieza sin usos, hablando por texto y voz, y con las notificaciones apagadas', async () => {
    await renderizar(<Preferencias />);

    expect(uso('Resumir documentos')).not.toBeChecked();
    expect(canal('Ambos')).toBeChecked();
    expect(aviso('Plazos y audiencias')).toHaveProp('value', false);
    expect(aviso('Resumen diario')).toHaveProp('value', false);
  });

  test('los usos se marcan varios; el canal, uno solo', async () => {
    const user = userEvent.setup();
    await renderizar(<Preferencias />);

    await user.press(uso('Controlar plazos'));
    await user.press(uso('Redactar escritos'));
    await user.press(canal('Voz'));

    expect(uso('Controlar plazos')).toBeChecked();
    expect(uso('Redactar escritos')).toBeChecked();
    expect(canal('Voz')).toBeChecked();
    expect(canal('Ambos')).not.toBeChecked();
  });

  test('sin usos no empieza y lo pide', async () => {
    const user = userEvent.setup();
    await renderizar(<Preferencias />);

    await user.press(empezar());

    expect(await screen.findByText('Elige al menos un uso')).toBeOnTheScreen();
    expect(useSesion.getState().usuario?.onboardingCompleto).toBe(false);
  });

  test('con el permiso ya dado, el interruptor se enciende sin preguntar', async () => {
    sistema.consultarPermisoNotificaciones.mockResolvedValue('concedido');
    await renderizar(<Preferencias />);

    await mover('Plazos y audiencias', true);

    await waitFor(() => expect(aviso('Plazos y audiencias')).toHaveProp('value', true));
    expect(screen.queryByText('Permitir notificaciones')).not.toBeOnTheScreen();
  });

  test('sin permiso, explica para qué es antes del aviso del sistema y, si lo da, se enciende', async () => {
    sistema.consultarPermisoNotificaciones.mockResolvedValue('preguntar');
    sistema.pedirPermisoNotificaciones.mockResolvedValue('concedido');
    const user = userEvent.setup();
    await renderizar(<Preferencias />);

    await mover('Resumen diario', true);
    expect(await screen.findByText('Permitir notificaciones')).toBeOnTheScreen();
    expect(sistema.pedirPermisoNotificaciones).not.toHaveBeenCalled();

    await user.press(screen.getByText('Permitir notificaciones'));

    await waitFor(() => expect(aviso('Resumen diario')).toHaveProp('value', true));
    expect(screen.queryByText('Permitir notificaciones')).not.toBeOnTheScreen();
  });

  test('"Ahora no" cierra la explicación y el interruptor queda apagado', async () => {
    sistema.consultarPermisoNotificaciones.mockResolvedValue('preguntar');
    const user = userEvent.setup();
    await renderizar(<Preferencias />);

    await mover('Plazos y audiencias', true);
    await user.press(await screen.findByText('Ahora no'));

    expect(sistema.pedirPermisoNotificaciones).not.toHaveBeenCalled();
    expect(aviso('Plazos y audiencias')).toHaveProp('value', false);
  });

  test('si niega el permiso en el aviso del sistema, queda apagado', async () => {
    sistema.consultarPermisoNotificaciones.mockResolvedValue('preguntar');
    sistema.pedirPermisoNotificaciones.mockResolvedValue('preguntar');
    const user = userEvent.setup();
    await renderizar(<Preferencias />);

    await mover('Plazos y audiencias', true);
    await user.press(await screen.findByText('Permitir notificaciones'));

    await waitFor(() => expect(screen.queryByText('Permitir notificaciones')).not.toBeOnTheScreen());
    expect(aviso('Plazos y audiencias')).toHaveProp('value', false);
  });

  test('si quedaron bloqueadas, ofrece abrir los Ajustes y no las enciende', async () => {
    sistema.consultarPermisoNotificaciones.mockResolvedValue('bloqueado');
    const abrirAjustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const user = userEvent.setup();
    await renderizar(<Preferencias />);

    await mover('Plazos y audiencias', true);
    await user.press(await screen.findByText('Abrir Ajustes'));

    expect(abrirAjustes).toHaveBeenCalledTimes(1);
    expect(aviso('Plazos y audiencias')).toHaveProp('value', false);
  });

  test('si el sistema falla al consultar el permiso, lo explica y queda apagado', async () => {
    sistema.consultarPermisoNotificaciones.mockRejectedValue(new Error('módulo nativo'));
    await renderizar(<Preferencias />);

    await mover('Plazos y audiencias', true);

    expect(await screen.findByText(/No pudimos activar las notificaciones/)).toBeOnTheScreen();
    expect(aviso('Plazos y audiencias')).toHaveProp('value', false);
  });

  test('si el sistema falla al pedir el permiso, cierra la explicación y sigue apagado', async () => {
    sistema.consultarPermisoNotificaciones.mockResolvedValue('preguntar');
    sistema.pedirPermisoNotificaciones.mockRejectedValue(new Error('módulo nativo'));
    const user = userEvent.setup();
    await renderizar(<Preferencias />);

    await mover('Resumen diario', true);
    await user.press(await screen.findByText('Permitir notificaciones'));

    expect(await screen.findByText(/No pudimos activar las notificaciones/)).toBeOnTheScreen();
    expect(screen.queryByText('Permitir notificaciones')).not.toBeOnTheScreen();
    expect(aviso('Resumen diario')).toHaveProp('value', false);
  });

  test('apagar un aviso no pregunta por el permiso', async () => {
    useBorradorOnboarding.getState().guardarPreferencias({
      usos: ['organizar_casos'],
      canal: 'texto',
      notificaciones: { plazos: true, resumenDiario: false },
    });
    await renderizar(<Preferencias />);

    await mover('Plazos y audiencias', false);

    expect(aviso('Plazos y audiencias')).toHaveProp('value', false);
    expect(sistema.consultarPermisoNotificaciones).not.toHaveBeenCalled();
  });

  test('"Empezar" envía todo el onboarding y la persona queda con el onboarding hecho', async () => {
    const user = userEvent.setup();
    await renderizar(<Preferencias />);

    await user.press(uso('Resumir documentos'));
    await user.press(empezar());

    await waitFor(() => expect(useSesion.getState().usuario?.onboardingCompleto).toBe(true));
    expect(useSesion.getState().usuario?.nombreUsuario).toBe('andrea.r');
  });

  test('si el envío falla, lo avisa y no pierde lo elegido', async () => {
    useBorradorOnboarding.getState().guardarPerfil({ nombre: 'Andrea Ruiz', usuario: 'andrea.ruiz' }); // ya tomado
    const user = userEvent.setup();
    await renderizar(<Preferencias />);

    await user.press(uso('Resumir documentos'));
    await user.press(empezar());

    expect(await screen.findByText(/Otra persona acaba de tomar tu nombre de usuario/)).toBeOnTheScreen();
    expect(uso('Resumir documentos')).toBeChecked();
  });

  test('al salir hacia atrás sin tocar Empezar, guarda lo elegido', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderizar(<Preferencias />);

    await user.press(uso('Informes a clientes'));
    await unmount();

    expect(useBorradorOnboarding.getState().preferencias).toEqual({
      usos: ['informes_clientes'],
      canal: 'ambos',
      notificaciones: { plazos: false, resumenDiario: false },
    });
  });

  test.each([
    ['sin el 1/5', () => useBorradorOnboarding.getState().vaciar(), '/perfil'],
    ['Colaborativo sin empresa ni solicitud', () => useBorradorOnboarding.getState().guardarModo('colaborativo'), '/empresa'],
  ])('%s vuelve al paso que corresponde', async (_caso, preparar, destino) => {
    preparar();

    await renderizar(<Preferencias />);

    expect(screen.getByText(`Redirige a ${destino}`)).toBeOnTheScreen();
  });
});

describe('esquemaPreferencias', () => {
  test('los usos salen sin repetir y en el orden de la lista', () => {
    const r = esquemaPreferencias.parse({
      usos: ['redactar_escritos', 'resumir_documentos', 'redactar_escritos'],
      canal: 'voz',
      notificaciones: { plazos: false, resumenDiario: true },
    });
    expect(r.usos).toEqual(['resumir_documentos', 'redactar_escritos']);
  });

  test('rechaza usos o canales que no existen', () => {
    const base = { usos: ['resumir_documentos'], canal: 'texto', notificaciones: { plazos: false, resumenDiario: false } };
    expect(esquemaPreferencias.safeParse({ ...base, usos: ['magia'] }).success).toBe(false);
    expect(esquemaPreferencias.safeParse({ ...base, canal: 'telepatia' }).success).toBe(false);
  });
});
