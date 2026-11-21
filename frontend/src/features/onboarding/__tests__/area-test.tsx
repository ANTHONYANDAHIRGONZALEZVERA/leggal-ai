import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import Area from '@/app/(onboarding)/area';
import { renderizar } from '@/pruebas/renderizar';

import { useBorradorOnboarding } from '../borrador';
import { esquemaArea } from '../esquemas';

jest.mock('@/components/icono', () => ({ Icono: () => null }));
jest.mock('@/components/esfera', () => ({ Esfera: () => null }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useBorradorOnboarding.getState().vaciar();
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

  test('rechaza roles o materias que no existen', () => {
    expect(esquemaArea.safeParse({ rol: 'juez', materias: [], matricula: '' }).success).toBe(false);
    expect(esquemaArea.safeParse({ rol: 'abogado', materias: ['magia'], matricula: '' }).success).toBe(false);
  });
});
