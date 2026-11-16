import { render, screen } from '@testing-library/react-native';

import { MedidorContrasena } from '../medidor-contrasena';

// Medidor bajo la contraseña del Registro (F08). Las reglas de cada nivel se
// prueban en seguridad-contrasena-test; aquí, lo que la persona ve y oye.
describe('<MedidorContrasena />', () => {
  test('sin contraseña no muestra ninguna palabra', async () => {
    await render(<MedidorContrasena contrasena="" />);

    expect(screen.getByLabelText('Seguridad de la contraseña')).toBeOnTheScreen();
    expect(screen.queryByText(/Débil|Regular|Buena|Fuerte/)).not.toBeOnTheScreen();
  });

  test('muestra la palabra del nivel y el lector de pantalla la lee', async () => {
    await render(<MedidorContrasena contrasena="Leggal2026!" />);

    expect(screen.getByText('Fuerte')).toBeOnTheScreen();
    expect(screen.getByLabelText('Seguridad de la contraseña: Fuerte')).toBeOnTheScreen();
  });

  test('se actualiza mientras la persona escribe', async () => {
    const { rerender } = await render(<MedidorContrasena contrasena="abc" />);
    expect(screen.getByText('Débil')).toBeOnTheScreen();

    await rerender(<MedidorContrasena contrasena="abcdefg1" />);
    expect(screen.getByText('Buena')).toBeOnTheScreen();
  });
});
