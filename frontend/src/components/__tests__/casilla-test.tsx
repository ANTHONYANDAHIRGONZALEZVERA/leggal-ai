import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Casilla } from '../casilla';

// El check se dibuja con Skia (no existe en Jest); aquí no hace falta verlo.
jest.mock('../icono', () => ({ Icono: () => null }));

const ETIQUETA = 'Acepto los Términos';

// Casilla de "Acepto los Términos" del Registro (F08).
describe('<Casilla />', () => {
  test('se anuncia como casilla sin marcar al inicio', async () => {
    await render(
      <Casilla marcada={false} onCambiar={jest.fn()} accessibilityLabel={ETIQUETA}>
        <Text>{ETIQUETA}</Text>
      </Casilla>,
    );

    expect(screen.getByRole('checkbox', { name: ETIQUETA })).not.toBeChecked();
  });

  test('al tocarla pide marcarla, y si ya está marcada pide desmarcarla', async () => {
    const user = userEvent.setup();
    const alCambiar = jest.fn();
    const { rerender } = await render(
      <Casilla marcada={false} onCambiar={alCambiar} accessibilityLabel={ETIQUETA}>
        <Text>{ETIQUETA}</Text>
      </Casilla>,
    );

    await user.press(screen.getByRole('checkbox'));
    expect(alCambiar).toHaveBeenLastCalledWith(true);

    // La pantalla guarda el valor y vuelve a dibujar la casilla marcada.
    await rerender(
      <Casilla marcada onCambiar={alCambiar} accessibilityLabel={ETIQUETA}>
        <Text>{ETIQUETA}</Text>
      </Casilla>,
    );
    expect(screen.getByRole('checkbox')).toBeChecked();

    await user.press(screen.getByRole('checkbox'));
    expect(alCambiar).toHaveBeenLastCalledWith(false);
  });

  test('tocar el texto también cambia la casilla (toda la fila es tocable)', async () => {
    const user = userEvent.setup();
    const alCambiar = jest.fn();
    await render(
      <Casilla marcada={false} onCambiar={alCambiar} accessibilityLabel={ETIQUETA}>
        <Text>{ETIQUETA}</Text>
      </Casilla>,
    );

    await user.press(screen.getByText(ETIQUETA));

    expect(alCambiar).toHaveBeenCalledWith(true);
  });
});
