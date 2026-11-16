import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { reiniciarMock } from '@/services/api/mock';
import { useSesion } from '@/services/sesion';

import { AccesoRapidoDev, mostrarAccesoRapido } from '../acceso-rapido-dev';

// Acceso rápido de desarrollo en el Login. En Jest __DEV__ es true y no hay
// EXPO_PUBLIC_API_URL (API simulada), como al desarrollar con Expo Go.
beforeEach(() => {
  reiniciarMock();
  useSesion.getState().cerrar();
});

describe('<AccesoRapidoDev />', () => {
  test('se muestra solo en desarrollo con la API simulada', async () => {
    expect(mostrarAccesoRapido).toBe(true);

    await render(<AccesoRapidoDev />);

    expect(screen.getByText('Solo desarrollo · entrar sin escribir')).toBeOnTheScreen();
  });

  test('"Demo · Inicio" entra con la cuenta demo, que ya hizo el onboarding', async () => {
    const user = userEvent.setup();
    await render(<AccesoRapidoDev />);

    await user.press(screen.getByLabelText('Entrar como Demo · Inicio'));

    await waitFor(() =>
      expect(useSesion.getState().usuario).toMatchObject({ correo: 'demo@leggal.ai', onboardingCompleto: true }),
    );
  });

  test('"Cuenta nueva · Onboarding" entra con una cuenta que tiene el onboarding pendiente', async () => {
    const user = userEvent.setup();
    await render(<AccesoRapidoDev />);

    await user.press(screen.getByLabelText('Entrar como Cuenta nueva · Onboarding'));

    await waitFor(() =>
      expect(useSesion.getState().usuario).toMatchObject({
        correo: 'nuevo@leggal.ai',
        nombre: 'Andrea Ruiz',
        onboardingCompleto: false,
      }),
    );
  });
});
