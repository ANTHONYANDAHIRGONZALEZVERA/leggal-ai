import { cabecerasDeDispositivo } from '..';

// Cabeceras de dispositivo del contrato B03: el backend ignora cualquier otro
// formato (por ejemplo "android/1.0.0") y lo guarda como "desconocido".

describe('cabecerasDeDispositivo', () => {
  test('envía la plataforma sola en X-Dispositivo y la versión aparte en X-Version-App', () => {
    expect(cabecerasDeDispositivo('android', '1.0.0')).toEqual({ 'X-Dispositivo': 'android', 'X-Version-App': '1.0.0' });
  });

  test('sin versión conocida no envía X-Version-App', () => {
    expect(cabecerasDeDispositivo('web', undefined)).toEqual({ 'X-Dispositivo': 'web' });
  });
});
