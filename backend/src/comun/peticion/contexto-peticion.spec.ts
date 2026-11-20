import type { Request } from 'express';
import { extraerContexto } from './contexto-peticion';

function peticion(
  headers: Record<string, string | string[]>,
  ip = '192.168.1.20',
): Request {
  return { headers, ip } as unknown as Request;
}

describe('extraerContexto', () => {
  it('lee dispositivo, versión e IP', () => {
    expect(
      extraerContexto(
        peticion({ 'x-dispositivo': 'android', 'x-version-app': '1.0.0' }),
      ),
    ).toEqual({
      dispositivo: 'android',
      versionApp: '1.0.0',
      ip: '192.168.1.20',
    });
  });

  it('acepta el dispositivo en mayúsculas o con espacios', () => {
    expect(
      extraerContexto(peticion({ 'x-dispositivo': ' iOS ' })).dispositivo,
    ).toBe('ios');
  });

  it('sin cabeceras: dispositivo desconocido y versión nula, sin rechazar', () => {
    expect(extraerContexto(peticion({}))).toEqual({
      dispositivo: 'desconocido',
      versionApp: null,
      ip: '192.168.1.20',
    });
  });

  it('un dispositivo que no es de la app se guarda como desconocido', () => {
    // Formato del borrador del frontend ("android/1.0.0"): no coincide.
    expect(
      extraerContexto(peticion({ 'x-dispositivo': 'android/1.0.0' }))
        .dispositivo,
    ).toBe('desconocido');
  });

  it.each(['1.0', 'v1.0.0', '1.0.0-beta', '1.0.0; DROP TABLE'])(
    'ignora la versión mal formada "%s"',
    (version) => {
      expect(
        extraerContexto(peticion({ 'x-version-app': version })).versionApp,
      ).toBeNull();
    },
  );

  it('si la cabecera llega repetida, usa la primera', () => {
    expect(
      extraerContexto(peticion({ 'x-dispositivo': ['web', 'android'] }))
        .dispositivo,
    ).toBe('web');
  });
});
