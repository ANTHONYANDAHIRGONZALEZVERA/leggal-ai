import { leerVencimiento, MARGEN_RENOVACION_MS, vencePronto } from '../jwt';

// Lectura del vencimiento del token (F10): decide si renovarlo antes de usarlo.

/** Arma un JWT de prueba con la carga indicada (la firma no importa aquí). */
function jwt(carga: object) {
  const parte = (datos: object) =>
    btoa(JSON.stringify(datos)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${parte({ alg: 'HS256' })}.${parte(carga)}.firma`;
}

describe('leerVencimiento', () => {
  test('lee "exp" (segundos) y lo devuelve en milisegundos', () => {
    expect(leerVencimiento(jwt({ sub: 'u1', exp: 1_900_000_000 }))).toBe(1_900_000_000_000);
  });

  test('entiende la variante base64url (con "-" y "_") de los JWT reales', () => {
    // Este nombre produce "-" o "_" al codificarse; un atob directo fallaría.
    const token = jwt({ exp: 1_900_000_000, nombre: 'ÿÿ>>??' });
    expect(token.split('.')[1]).toMatch(/[-_]/);

    expect(leerVencimiento(token)).toBe(1_900_000_000_000);
  });

  test('un token sin "exp" o que no es JWT devuelve null', () => {
    expect(leerVencimiento(jwt({ sub: 'u1' }))).toBeNull();
    expect(leerVencimiento('token-opaco')).toBeNull();
    expect(leerVencimiento('a.%%%.c')).toBeNull();
  });
});

describe('vencePronto', () => {
  const ahora = 1_800_000_000_000;

  test('es true si le queda menos de un minuto', () => {
    const token = jwt({ exp: (ahora + MARGEN_RENOVACION_MS - 1000) / 1000 });
    expect(vencePronto(token, ahora)).toBe(true);
  });

  test('es true si ya venció', () => {
    expect(vencePronto(jwt({ exp: (ahora - 5000) / 1000 }), ahora)).toBe(true);
  });

  test('es false si le queda más de un minuto', () => {
    expect(vencePronto(jwt({ exp: (ahora + 5 * 60_000) / 1000 }), ahora)).toBe(false);
  });

  test('es false si no se puede saber (token que no es JWT): se usa tal cual', () => {
    expect(vencePronto('token-opaco', ahora)).toBe(false);
  });
});
