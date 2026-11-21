import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import Empresa from '@/app/(onboarding)/empresa';
import { iniciarSesion } from '@/features/auth/api';
import { useBorradorOnboarding } from '@/features/onboarding/borrador';
import { renderizar } from '@/pruebas/renderizar';
import { leerCarga } from '@/services/api/jwt';
import { reiniciarMock, USUARIO_NUEVO } from '@/services/api/mock';
import { CODIGOS_DE_PRUEBA, RUC_TOMADO } from '@/services/api/mock-empresas';
import { useSesion } from '@/services/sesion';

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

// Llega desde el 3/5 en modo Colaborativo, con sesión real de la API simulada.
beforeEach(async () => {
  jest.clearAllMocks();
  reiniciarMock();
  const borrador = useBorradorOnboarding.getState();
  borrador.vaciar();
  borrador.guardarPerfil({ nombre: 'Andrea Ruiz', usuario: 'andrea.r' });
  borrador.guardarArea({ rol: 'abogado', materias: [], matricula: null });
  borrador.guardarModo('colaborativo');
  useSesion.getState().iniciar(await iniciarSesion({ correo: USUARIO_NUEVO.correo, contrasena: USUARIO_NUEVO.contrasena }));
});

const campoCodigo = () => screen.getByLabelText('Código de invitación');
const solicitarAcceso = () => screen.getByRole('button', { name: 'Solicitar acceso' });

// Paso 4/5 "Conéctate a tu empresa" (F33): pestaña Unirme con código.
describe('Onboarding 4/5: unirme con código', () => {
  test('empieza en "Unirme con código", sin QR, enlace ni aviso de dominio (fuera del plan)', async () => {
    await renderizar(<Empresa />);

    expect(screen.getByRole('tab', { name: 'Unirme con código' })).toBeSelected();
    expect(screen.queryByText('Escanear QR')).not.toBeOnTheScreen();
    expect(screen.queryByText('Enlace de invitación')).not.toBeOnTheScreen();
    expect(screen.queryByText(/dominio verificado/)).not.toBeOnTheScreen();
    expect(solicitarAcceso()).toBeDisabled();
  });

  test('con los 6 caracteres muestra la empresa, el rol y si requiere aprobación', async () => {
    const user = userEvent.setup();
    await renderizar(<Empresa />);

    await user.type(campoCodigo(), 'acc7k2');

    expect(campoCodigo()).toHaveProp('value', 'ACC7K2');
    expect(await screen.findByText('ACCONS S.A.S.')).toBeOnTheScreen();
    expect(screen.getByText('Empresa verificada')).toBeOnTheScreen();
    expect(screen.getByText('Abogado/a')).toBeOnTheScreen();
    expect(screen.getByText('Requiere aprobación')).toBeOnTheScreen();
    expect(solicitarAcceso()).toBeEnabled();
  });

  test('pegar el código con guion y espacios también funciona', async () => {
    const user = userEvent.setup();
    await renderizar(<Empresa />);

    await user.paste(campoCodigo(), ' acc-7k2 ');

    expect(campoCodigo()).toHaveProp('value', 'ACC7K2');
    expect(await screen.findByText('ACCONS S.A.S.')).toBeOnTheScreen();
  });

  test('un código que no existe lo avisa y no deja solicitar', async () => {
    const user = userEvent.setup();
    await renderizar(<Empresa />);

    await user.type(campoCodigo(), 'ZZZ999');

    expect(await screen.findByText('Ese código no existe. Revisa que esté bien escrito.')).toBeOnTheScreen();
    expect(solicitarAcceso()).toBeDisabled();
  });

  test('un código vencido pide uno nuevo', async () => {
    const user = userEvent.setup();
    await renderizar(<Empresa />);

    await user.type(campoCodigo(), CODIGOS_DE_PRUEBA.vencido);

    expect(await screen.findByText('Ese código ya no sirve. Pide uno nuevo al administrador de tu empresa.')).toBeOnTheScreen();
  });

  test('al borrar un carácter desaparece la empresa y vuelve a pedir el código completo', async () => {
    const user = userEvent.setup();
    await renderizar(<Empresa />);
    await user.type(campoCodigo(), CODIGOS_DE_PRUEBA.accons);
    await screen.findByText('ACCONS S.A.S.');

    await user.type(campoCodigo(), '{Backspace}');

    expect(screen.queryByText('ACCONS S.A.S.')).not.toBeOnTheScreen();
    expect(screen.getByText('Escribe los 6 caracteres del código')).toBeOnTheScreen();
    expect(solicitarAcceso()).toBeDisabled();
  });

  test('"Solicitar acceso" envía la solicitud, la guarda y pasa a "Solicitud enviada"', async () => {
    const user = userEvent.setup();
    await renderizar(<Empresa />);
    await user.type(campoCodigo(), CODIGOS_DE_PRUEBA.accons);
    await screen.findByText('ACCONS S.A.S.');

    await user.press(solicitarAcceso());

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/solicitud'));
    expect(useBorradorOnboarding.getState().solicitud).toMatchObject({ estado: 'en_espera', codigo: 'ACC-7K2' });
  });

  test('con un código sin aprobación (DIR-8M3) entra directo y sigue al 5/5', async () => {
    const user = userEvent.setup();
    await renderizar(<Empresa />);
    await user.type(campoCodigo(), CODIGOS_DE_PRUEBA.directo);
    expect(await screen.findByText('Inmediato')).toBeOnTheScreen();

    await user.press(solicitarAcceso());

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/preferencias'));
    expect(useBorradorOnboarding.getState().solicitud).toMatchObject({ estado: 'aprobada', codigo: 'DIR-8M3' });
  });

  test('con una solicitud pendiente lo avisa y deja verla', async () => {
    const user = userEvent.setup();
    await renderizar(<Empresa />);
    await user.type(campoCodigo(), CODIGOS_DE_PRUEBA.accons);
    await screen.findByText('ACCONS S.A.S.');
    await user.press(solicitarAcceso());

    expect(await screen.findByText('Tu solicitud a ACCONS S.A.S. está pendiente.')).toBeOnTheScreen();
    await user.press(screen.getByText('Ver solicitud'));
    expect(router.push).toHaveBeenLastCalledWith('/solicitud');
  });

  test('pedir otra vez a la misma empresa avisa que ya hay una solicitud', async () => {
    const user = userEvent.setup();
    await renderizar(<Empresa />);
    await user.type(campoCodigo(), CODIGOS_DE_PRUEBA.accons);
    await screen.findByText('ACCONS S.A.S.');
    await user.press(solicitarAcceso());
    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
    // Mientras termina la primera, el botón sigue "cargando" (desactivado).
    await waitFor(() => expect(solicitarAcceso()).toBeEnabled());

    await user.press(solicitarAcceso());

    expect(await screen.findByText('Ya pediste unirte a esa empresa. Espera la respuesta del administrador.')).toBeOnTheScreen();
  });
});

describe('Onboarding 4/5: crear empresa', () => {
  async function abrirCrear() {
    const user = userEvent.setup();
    await renderizar(<Empresa />);
    await user.press(screen.getByRole('tab', { name: 'Crear empresa' }));
    return user;
  }

  test('la pestaña muestra razón social, RUC, tamaño y el aviso de administrador', async () => {
    await abrirCrear();

    expect(screen.getByRole('tab', { name: 'Crear empresa' })).toBeSelected();
    expect(screen.getByLabelText('Razón social')).toBeOnTheScreen();
    expect(screen.getByLabelText('RUC')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: '6–20 personas' })).toBeOnTheScreen();
    expect(screen.getByText(/Serás administrador/)).toBeOnTheScreen();
  });

  test('vacío no la crea y pide cada dato', async () => {
    const user = await abrirCrear();

    await user.press(screen.getByRole('button', { name: 'Crear empresa' }));

    expect(await screen.findByText('Ingresa la razón social')).toBeOnTheScreen();
    expect(screen.getByText('El RUC tiene 13 dígitos')).toBeOnTheScreen();
    expect(screen.getByText('Elige el tamaño de tu equipo')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('el RUC solo acepta dígitos, hasta 13', async () => {
    const user = await abrirCrear();

    await user.type(screen.getByLabelText('RUC'), '17-9001-2345-001');

    expect(screen.getByLabelText('RUC')).toHaveProp('value', '1790012345001');
  });

  test('con datos válidos la crea, guarda la sesión con su empresa y pasa al 5/5', async () => {
    const user = await abrirCrear();

    await user.type(screen.getByLabelText('Razón social'), 'Estudio Ruiz');
    await user.type(screen.getByLabelText('RUC'), '1790099999001');
    await user.press(screen.getByRole('radio', { name: '1–5 personas' }));
    await user.press(screen.getByRole('button', { name: 'Crear empresa' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/preferencias'));
    const empresa = useBorradorOnboarding.getState().empresa;
    expect(empresa).toMatchObject({ nombre: 'Estudio Ruiz' });
    expect(leerCarga(useSesion.getState().tokens!.acceso)?.tid).toBe(empresa!.id);
  });

  test('un RUC ya registrado se avisa debajo del campo', async () => {
    const user = await abrirCrear();

    await user.type(screen.getByLabelText('Razón social'), 'Otra empresa');
    await user.type(screen.getByLabelText('RUC'), RUC_TOMADO);
    await user.press(screen.getByRole('radio', { name: '6–20 personas' }));
    await user.press(screen.getByRole('button', { name: 'Crear empresa' }));

    expect(await screen.findByText('Ya hay una empresa registrada con este RUC')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('si ya la creó y volvió atrás, no la crea otra vez: solo deja continuar', async () => {
    useBorradorOnboarding.getState().guardarEmpresa({ id: 'emp-1', nombre: 'Estudio Ruiz', verificada: false });
    const user = userEvent.setup();

    await renderizar(<Empresa />);

    expect(screen.getByRole('tab', { name: 'Crear empresa' })).toBeSelected();
    expect(screen.getByText(/Ya creaste Estudio Ruiz/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('RUC')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(router.push).toHaveBeenCalledWith('/preferencias');
  });
});

describe('Onboarding 4/5: pasos anteriores', () => {
  test.each([
    ['sin el 1/5', () => useBorradorOnboarding.getState().vaciar(), '/perfil'],
    ['en modo Personal', () => useBorradorOnboarding.getState().guardarModo('personal'), '/modo'],
  ])('%s vuelve al paso que corresponde', async (_caso, preparar, destino) => {
    preparar();

    await renderizar(<Empresa />);

    expect(screen.getByText(`Redirige a ${destino}`)).toBeOnTheScreen();
  });
});
