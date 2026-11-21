import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import Area from '@/app/(onboarding)/area';
import { renderizar } from '@/pruebas/renderizar';

import { useBorradorOnboarding } from '../borrador';
import { esquemaArea } from '../esquemas';

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

// Llega desde el 1/5 con el nombre y el @usuario ya en el borrador.
beforeEach(() => {
  jest.clearAllMocks();
  useBorradorOnboarding.getState().vaciar();
  useBorradorOnboarding.getState().guardarPerfil({ nombre: 'Ana Pérez', usuario: 'ana.perez' });
});

const rol = (titulo: string) => screen.getByRole('radio', { name: titulo });
const materia = (titulo: string) => screen.getByRole('checkbox', { name: titulo });
const continuar = () => screen.getByText('Continuar');
const campoMatricula = () => screen.queryByLabelText('Matrícula profesional (opcional)');

// Paso 2/5 "¿En qué área te desempeñas?" (F30).
describe('Onboarding 2/5: ¿En qué área te desempeñas?', () => {
  test('empieza sin rol ni materias elegidos y sin el campo de matrícula', async () => {
    await renderizar(<Area />);

    expect(rol('Abogado/a')).not.toBeChecked();
    expect(materia('Laboral')).not.toBeChecked();
    expect(campoMatricula()).not.toBeOnTheScreen();
  });

  test('sin rol no avanza y lo pide', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(continuar());

    expect(await screen.findByText('Elige tu rol')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('se elige un solo rol', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(rol('Contador/a'));
    await user.press(rol('Estudiante'));

    expect(rol('Estudiante')).toBeChecked();
    expect(rol('Contador/a')).not.toBeChecked();
  });

  test('las materias se marcan y desmarcan, varias a la vez', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(materia('Laboral'));
    await user.press(materia('Penal'));
    await user.press(materia('Laboral'));

    expect(materia('Penal')).toBeChecked();
    expect(materia('Laboral')).not.toBeChecked();
  });

  test('la matrícula aparece solo para Abogado/a', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(rol('Abogado/a'));
    expect(campoMatricula()).toBeOnTheScreen();

    await user.press(rol('Contador/a'));
    expect(campoMatricula()).not.toBeOnTheScreen();
  });

  test('con rol y materias guarda el paso y pasa al 3/5', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(rol('Abogado/a'));
    await user.press(materia('Laboral'));
    await user.press(materia('Propiedad intelectual'));
    await user.type(campoMatricula()!, '17-2015-123');
    await user.press(continuar());

    expect(router.push).toHaveBeenCalledWith('/modo');
    expect(useBorradorOnboarding.getState().area).toEqual({
      rol: 'abogado',
      materias: ['laboral', 'propiedad_intelectual'],
      matricula: '17-2015-123',
    });
  });

  test('sin materias también avanza (son opcionales)', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(rol('Estudiante'));
    await user.press(continuar());

    expect(router.push).toHaveBeenCalledWith('/modo');
    expect(useBorradorOnboarding.getState().area).toEqual({ rol: 'estudiante', materias: [], matricula: null });
  });

  test('una matrícula con símbolos raros muestra la regla y no avanza', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(rol('Abogado/a'));
    await user.type(campoMatricula()!, '<script>');
    await user.press(continuar());

    expect(await screen.findByText('Usa solo letras, números, puntos, guiones o barras')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('al volver desde el paso 3 encuentra lo que ya había elegido', async () => {
    useBorradorOnboarding.getState().guardarArea({ rol: 'abogado', materias: ['civil'], matricula: '17-2015-123' });

    await renderizar(<Area />);

    expect(rol('Abogado/a')).toBeChecked();
    expect(materia('Civil')).toBeChecked();
    expect(campoMatricula()).toHaveProp('value', '17-2015-123');
  });

  test('el aviso "Elige tu rol" se va apenas elige uno', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);
    await user.press(continuar());
    await screen.findByText('Elige tu rol');

    await user.press(rol('Gerente / Admin.'));

    expect(screen.queryByText('Elige tu rol')).not.toBeOnTheScreen();
  });

  test('una matrícula inválida escrita como abogado no bloquea si después cambia de rol', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(rol('Abogado/a'));
    await user.type(campoMatricula()!, '<<<');
    await user.press(rol('Contador/a'));
    await user.press(continuar());

    expect(router.push).toHaveBeenCalledWith('/modo');
    expect(useBorradorOnboarding.getState().area).toEqual({ rol: 'contador', materias: [], matricula: null });
  });

  test('el campo de matrícula no deja escribir más de 30 caracteres', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(rol('Abogado/a'));

    expect(campoMatricula()).toHaveProp('maxLength', 30);
  });

  test('sin el paso 1/5 en el borrador (app recargada), vuelve al 1/5', async () => {
    useBorradorOnboarding.getState().vaciar();

    await renderizar(<Area />);

    expect(screen.getByText('Redirige a /perfil')).toBeOnTheScreen();
    expect(screen.queryByText('Continuar')).not.toBeOnTheScreen();
  });

  test('al salir hacia atrás sin tocar Continuar, guarda lo elegido', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderizar(<Area />);

    await user.press(rol('Estudiante'));
    await user.press(materia('Familia'));
    await unmount();

    expect(useBorradorOnboarding.getState().area).toEqual({ rol: 'estudiante', materias: ['familia'], matricula: null });
  });

  test('al salir sin haber elegido rol no guarda nada', async () => {
    const { unmount } = await renderizar(<Area />);

    await unmount();

    expect(useBorradorOnboarding.getState().area).toBeNull();
  });

  test('la flecha vuelve al paso 1/5', async () => {
    const user = userEvent.setup();
    await renderizar(<Area />);

    await user.press(screen.getByLabelText('Volver'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe('esquemaArea', () => {
  test('la matrícula de otro rol se descarta (solo se guarda para abogados)', () => {
    expect(esquemaArea.parse({ rol: 'contador', materias: [], matricula: '17-2015-123' })).toEqual({
      rol: 'contador',
      materias: [],
      matricula: null,
    });
  });

  test('una matrícula vacía o con espacios queda en null', () => {
    expect(esquemaArea.parse({ rol: 'abogado', materias: [], matricula: '   ' }).matricula).toBeNull();
  });

  test.each([
    ['un guion solo', '-'],
    ['sin números', 'ABC'],
    ['menos de 3 caracteres', '1'],
    ['símbolos', '17_2015'],
    ['más de 30 caracteres', '1'.repeat(31)],
  ])('rechaza una matrícula de abogado con %s', (_caso, matricula) => {
    const r = esquemaArea.safeParse({ rol: 'abogado', materias: [], matricula });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['matricula']);
  });

  test('acepta matrículas reales y las guarda en mayúsculas', () => {
    for (const [escrita, guardada] of [
      ['17-2015-123', '17-2015-123'],
      ['mat. 1234', 'MAT. 1234'],
      ['09/2020/55', '09/2020/55'],
    ]) {
      expect(esquemaArea.parse({ rol: 'abogado', materias: [], matricula: escrita }).matricula).toBe(guardada);
    }
  });

  test('las materias salen sin repetir y en el orden de la lista', () => {
    expect(esquemaArea.parse({ rol: 'otro', materias: ['penal', 'laboral', 'penal'], matricula: '' }).materias).toEqual([
      'laboral',
      'penal',
    ]);
  });

  test('rechaza roles o materias que no existen', () => {
    expect(esquemaArea.safeParse({ rol: 'juez', materias: [], matricula: '' }).success).toBe(false);
    expect(esquemaArea.safeParse({ rol: 'abogado', materias: ['magia'], matricula: '' }).success).toBe(false);
  });
});
