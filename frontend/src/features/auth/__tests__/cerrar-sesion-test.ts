import { api } from '@/services/api';
import { reiniciarMock, USUARIO_DEMO } from '@/services/api/mock';
import { useSesion } from '@/services/sesion';

import { cerrarSesion, iniciarSesion } from '../api';

// Cerrar sesión (F10), contra la API simulada.

beforeEach(() => {
  reiniciarMock();
  useSesion.getState().cerrar();
  jest.restoreAllMocks();
});

async function entrarConDemo() {
  useSesion.getState().iniciar(await iniciarSesion({ correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena }));
}

describe('cerrarSesion', () => {
  test('borra la sesión del teléfono y avisa al servidor con POST /auth/logout, sin renovar antes', async () => {
    await entrarConDemo();
    const { renovacion } = useSesion.getState().tokens!;
    const peticion = jest.spyOn(api, 'peticion');

    await cerrarSesion();

    expect(peticion).toHaveBeenCalledWith('/auth/logout', { metodo: 'POST', sinRenovar: true });
    expect(useSesion.getState()).toMatchObject({ usuario: null, tokens: null });
    // El servidor revocó la sesión: su refresh ya no sirve.
    const refresh = api.peticion('/auth/refresh', { metodo: 'POST', cuerpo: { tokenRefresco: renovacion }, publica: true });
    await expect(refresh).rejects.toMatchObject({ codigo: 'SESION_REVOCADA' });
  });

  test('si el servidor no responde (sin red), la sesión se cierra igual', async () => {
    await entrarConDemo();
    jest.spyOn(api, 'peticion').mockRejectedValue(new Error('sin red'));

    await expect(cerrarSesion()).resolves.toBeUndefined();

    expect(useSesion.getState()).toMatchObject({ usuario: null, tokens: null });
  });

  test('sin sesión no llama al servidor', async () => {
    const peticion = jest.spyOn(api, 'peticion');

    await cerrarSesion();

    expect(peticion).not.toHaveBeenCalled();
  });
});
