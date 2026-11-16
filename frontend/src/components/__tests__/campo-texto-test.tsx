import { render, screen, userEvent } from '@testing-library/react-native';

import { CampoTexto } from '../campo-texto';

// Los íconos se dibujan con Skia (motor gráfico nativo que Jest no tiene).
// Aquí solo importa el comportamiento del campo, así que el ícono no dibuja nada.
jest.mock('../icono', () => ({ Icono: () => null }));

// Campo de texto de Login y Registro (F06, F08).
describe('<CampoTexto />', () => {
  test('muestra la etiqueta y el lector de pantalla encuentra el campo por ella', async () => {
    await render(<CampoTexto etiqueta="Correo electrónico" placeholder="nombre@empresa.com" />);

    expect(screen.getByText('Correo electrónico')).toBeOnTheScreen();
    expect(screen.getByLabelText('Correo electrónico')).toHaveProp('placeholder', 'nombre@empresa.com');
  });

  test('muestra el mensaje de error debajo del campo', async () => {
    await render(<CampoTexto etiqueta="Correo electrónico" error="Ingresa un correo válido" />);

    expect(screen.getByText('Ingresa un correo válido')).toBeOnTheScreen();
  });

  test('un campo normal no tiene el botón del ojo', async () => {
    await render(<CampoTexto etiqueta="Nombres y apellidos" />);

    expect(screen.queryByLabelText('Mostrar contraseña')).not.toBeOnTheScreen();
  });

  test('el ojo de la contraseña la muestra y la vuelve a ocultar', async () => {
    const user = userEvent.setup();
    await render(<CampoTexto etiqueta="Contraseña" secureTextEntry />);
    const campo = screen.getByLabelText('Contraseña');

    // Empieza oculta (puntos).
    expect(campo).toHaveProp('secureTextEntry', true);

    await user.press(screen.getByLabelText('Mostrar contraseña'));
    expect(campo).toHaveProp('secureTextEntry', false);

    // El botón ahora anuncia la acción contraria.
    await user.press(screen.getByLabelText('Ocultar contraseña'));
    expect(campo).toHaveProp('secureTextEntry', true);
  });

  test('avisa a la pantalla cada vez que la persona escribe', async () => {
    const user = userEvent.setup();
    const alCambiar = jest.fn();
    await render(<CampoTexto etiqueta="Correo electrónico" onChangeText={alCambiar} />);

    await user.type(screen.getByLabelText('Correo electrónico'), 'ana');

    expect(alCambiar).toHaveBeenLastCalledWith('ana');
  });
});
