import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, type AlertButton } from 'react-native';

import Solicitud from '@/app/(onboarding)/solicitud';
import { iniciarSesion } from '@/features/auth/api';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { renderizar } from '@/pruebas/renderizar';
import { reiniciarMock, USUARIO_NUEVO } from '@/services/api/mock';
import { CODIGOS_DE_PRUEBA, decidirSolicitud } from '@/services/api/mock-empresas';
import { useSesion } from '@/services/sesion';

import { solicitarAcceso } from '../api';

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

/** Responde el diálogo de confirmación tocando el botón con ese texto. */
const responderAlerta = (texto: string) =>
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensaje, botones?: AlertButton[]) => {
    botones?.find((b) => b.text === texto)?.onPress?.();
  });

// Llega desde el 4/5 con una solicitud real a ACCONS en la API simulada.
beforeEach(async () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  reiniciarMock();
  const borrador = useBorradorOnboarding.getState();
  borrador.vaciar();
  borrador.guardarPerfil({ nombre: 'Andrea Ruiz', usuario: 'andrea.r' });
  useSesion.getState().iniciar(await iniciarSesion({ correo: USUARIO_NUEVO.correo, contrasena: USUARIO_NUEVO.contrasena }));
  borrador.guardarSolicitud(await solicitarAcceso(CODIGOS_DE_PRUEBA.accons));
});

const id = () => useBorradorOnboarding.getState().solicitud!.id;

// "Solicitud enviada" (F33).
describe('Solicitud enviada', () => {
  test('muestra a qué empresa y con qué rol pidió unirse, y la línea de estado', async () => {
    await renderizar(<Solicitud />);

    expect(screen.getByText('ACCONS S.A.S.')).toBeOnTheScreen();
    expect(screen.getByText(/como Abogado\/a/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Código validado: ACC-7K2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Revisión del administrador: En curso')).toBeOnTheScreen();
    expect(screen.getByLabelText('Acceso habilitado: Pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Te avisaremos cuando te aprueben.')).toBeOnTheScreen();
  });

  test('"Continuar en modo personal" sigue al 5/5 y la solicitud queda pendiente', async () => {
    const user = userEvent.setup();
    await renderizar(<Solicitud />);

    await user.press(screen.getByText('Continuar en modo personal'));

    expect(router.push).toHaveBeenCalledWith('/preferencias');
    expect(useBorradorOnboarding.getState().solicitud?.estado).toBe('en_espera');
  });

  test('"Cancelar solicitud" pide confirmación; con "No" no cancela nada', async () => {
    const alerta = responderAlerta('No');
    const user = userEvent.setup();
    await renderizar(<Solicitud />);

    await user.press(screen.getByText('Cancelar solicitud'));

    expect(alerta).toHaveBeenCalledWith('¿Cancelar la solicitud?', 'Ya no pedirás unirte a ACCONS S.A.S.', expect.any(Array));
    expect(router.back).not.toHaveBeenCalled();
    expect(useBorradorOnboarding.getState().solicitud).not.toBeNull();
  });

  test('al confirmar, la cancela en el servidor, la borra del borrador y vuelve al 4/5', async () => {
    responderAlerta('Sí, cancelar');
    const user = userEvent.setup();
    await renderizar(<Solicitud />);
    const cancelada = id();

    await user.press(screen.getByText('Cancelar solicitud'));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(useBorradorOnboarding.getState().solicitud).toBeNull();
    // En el servidor ya no está pendiente: se puede volver a pedir.
    const nueva = await solicitarAcceso(CODIGOS_DE_PRUEBA.accons);
    expect(nueva).toMatchObject({ estado: 'en_espera' });
    expect(nueva.id).not.toBe(cancelada);
  });

  test('si el administrador ya la aprobó, lo muestra y deja continuar con la empresa', async () => {
    decidirSolicitud(id(), 'aprobada');
    const user = userEvent.setup();
    await renderizar(<Solicitud />);

    expect(await screen.findByLabelText('Revisión del administrador: Aprobada')).toBeOnTheScreen();
    expect(screen.getByLabelText('Acceso habilitado: Listo')).toBeOnTheScreen();
    expect(screen.getByText('Ya eres parte de ACCONS S.A.S.')).toBeOnTheScreen();
    expect(screen.queryByText('Cancelar solicitud')).not.toBeOnTheScreen();
    await waitFor(() => expect(useBorradorOnboarding.getState().solicitud?.estado).toBe('aprobada'));

    await user.press(screen.getByText('Continuar'));
    expect(router.push).toHaveBeenCalledWith('/preferencias');
  });

  test('si la rechazó, lo muestra y ya no ofrece cancelar', async () => {
    decidirSolicitud(id(), 'rechazada');
    await renderizar(<Solicitud />);

    expect(await screen.findByLabelText('Revisión del administrador: Rechazada')).toBeOnTheScreen();
    expect(screen.getByLabelText('Acceso habilitado: No habilitado')).toBeOnTheScreen();
    expect(screen.getByText(/no aprobó tu solicitud/)).toBeOnTheScreen();
    expect(screen.queryByText('Cancelar solicitud')).not.toBeOnTheScreen();
  });

  test('sin solicitud en el borrador vuelve al 4/5', async () => {
    useBorradorOnboarding.getState().guardarSolicitud(null);

    await renderizar(<Solicitud />);

    expect(screen.getByText('Redirige a /empresa')).toBeOnTheScreen();
  });
});
