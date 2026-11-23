import { reiniciarMock, transporteSimulado, USUARIO_DEMO } from '../mock';
import { CODIGO_DE_PRUEBA, ESPERA_REENVIO_MS, INTENTOS_POR_CODIGO, vencerCodigos } from '../mock-codigos';

// API simulada de los códigos de 6 dígitos (B27 y B28), según la propuesta de
// docs/api/codigos-borrador-frontend.md.

type Respuesta = { estado: number; datos: any };

async function pedir(metodo: string, ruta: string, cuerpo?: object, token?: string): Promise<Respuesta> {
  const r = await transporteSimulado(`https://cualquier.dominio${ruta}`, {
    method: metodo,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  return { estado: r.status, datos: texto ? JSON.parse(texto) : undefined };
}

const NUEVA = { nombre: 'Ana Pérez', correo: 'ana@empresa.com', contrasena: 'Leggal2026!', aceptaTerminos: true };
let token: string;

beforeEach(async () => {
  reiniciarMock();
  jest.restoreAllMocks();
  const { datos } = await pedir('POST', '/auth/register', NUEVA);
  token = datos.tokenAcceso;
});

const verificar = (codigo: string, conToken = token) => pedir('POST', '/auth/verify-email', { codigo }, conToken);
const dentroDe = (ms: number) => jest.spyOn(Date, 'now').mockReturnValue(Date.now() + ms);

describe('API simulada: verificar el correo (B27)', () => {
  test('una cuenta nueva empieza sin verificar y el código correcto la verifica', async () => {
    const r = await verificar(CODIGO_DE_PRUEBA);

    expect(r).toMatchObject({ estado: 200, datos: { usuario: { correo: 'ana@empresa.com', correoVerificado: true } } });
  });

  test('un código incorrecto responde 400 CODIGO_INCORRECTO señalando el campo', async () => {
    expect(await verificar('000000')).toMatchObject({ estado: 400, datos: { codigo: 'CODIGO_INCORRECTO', campos: { codigo: expect.any(String) } } });
  });

  test(`después de ${INTENTOS_POR_CODIGO} intentos fallidos se bloquea (429), aunque luego acierte`, async () => {
    for (let i = 0; i < INTENTOS_POR_CODIGO; i++) await verificar('000000');

    expect(await verificar(CODIGO_DE_PRUEBA)).toMatchObject({ estado: 429, datos: { codigo: 'DEMASIADOS_INTENTOS' } });
  });

  test('un código vencido responde 410 CODIGO_EXPIRADO', async () => {
    vencerCodigos();

    expect(await verificar(CODIGO_DE_PRUEBA)).toMatchObject({ estado: 410, datos: { codigo: 'CODIGO_EXPIRADO' } });
  });

  test('verificar dos veces no falla (idempotente)', async () => {
    await verificar(CODIGO_DE_PRUEBA);

    expect((await verificar('000000')).estado).toBe(200);
  });

  test('reenviar antes de 45 s responde 429 ESPERA_REENVIO; después, un código nuevo que sirve', async () => {
    expect(await pedir('POST', '/auth/verify-email/resend', undefined, token)).toMatchObject({
      estado: 429,
      datos: { codigo: 'ESPERA_REENVIO' },
    });

    dentroDe(ESPERA_REENVIO_MS);
    expect((await pedir('POST', '/auth/verify-email/resend', undefined, token)).estado).toBe(204);
    expect((await verificar(CODIGO_DE_PRUEBA)).estado).toBe(200);
  });

  test('sin sesión no se puede verificar (401)', async () => {
    expect((await verificar(CODIGO_DE_PRUEBA, 'no-es-un-token')).estado).toBe(401);
  });
});

describe('API simulada: cambiar el correo sin verificar', () => {
  const cambiar = (correo: string) => pedir('PATCH', '/auth/email', { correo }, token);

  test('cambia el correo, envía otro código y se puede entrar con el correo nuevo', async () => {
    expect(await cambiar('  ANA.P@empresa.com ')).toMatchObject({ estado: 200, datos: { usuario: { correo: 'ana.p@empresa.com', correoVerificado: false } } });
    expect((await verificar(CODIGO_DE_PRUEBA)).estado).toBe(200);
    expect((await pedir('POST', '/auth/login', { correo: 'ana.p@empresa.com', contrasena: NUEVA.contrasena })).estado).toBe(200);
    expect((await pedir('POST', '/auth/login', { correo: NUEVA.correo, contrasena: NUEVA.contrasena })).estado).toBe(401);
  });

  test('un correo de otra cuenta responde 409 CORREO_EN_USO; uno mal escrito, 400', async () => {
    expect(await cambiar(USUARIO_DEMO.correo)).toMatchObject({ estado: 409, datos: { codigo: 'CORREO_EN_USO' } });
    expect(await cambiar('no-es-correo')).toMatchObject({ estado: 400, datos: { campos: { correo: expect.any(String) } } });
  });

  test('ya verificado no se puede cambiar por aquí (409 CORREO_YA_VERIFICADO)', async () => {
    await verificar(CODIGO_DE_PRUEBA);

    expect(await cambiar('otro@empresa.com')).toMatchObject({ estado: 409, datos: { codigo: 'CORREO_YA_VERIFICADO' } });
  });
});

describe('API simulada: recuperar la contraseña (B28)', () => {
  const olvide = (correo: string) => pedir('POST', '/auth/password/forgot', { correo });
  const restablecer = (cuerpo: object) => pedir('POST', '/auth/password/reset', cuerpo);
  const entrar = (contrasena: string) => pedir('POST', '/auth/login', { correo: USUARIO_DEMO.correo, contrasena });

  test('pedir el código responde 204 exista o no la cuenta (no revela qué correos tienen cuenta)', async () => {
    expect((await olvide(USUARIO_DEMO.correo)).estado).toBe(204);
    expect((await olvide('nadie@empresa.com')).estado).toBe(204);
  });

  test('con el código correcto cambia la contraseña: la nueva entra y la vieja ya no', async () => {
    await olvide(USUARIO_DEMO.correo);

    expect((await restablecer({ correo: USUARIO_DEMO.correo, codigo: CODIGO_DE_PRUEBA, contrasena: 'NuevaClave2026!' })).estado).toBe(204);
    expect((await entrar('NuevaClave2026!')).estado).toBe(200);
    expect((await entrar(USUARIO_DEMO.contrasena)).estado).toBe(401);
  });

  test('al cambiarla cierra las sesiones abiertas de la cuenta', async () => {
    const { datos: sesion } = await entrar(USUARIO_DEMO.contrasena);
    await olvide(USUARIO_DEMO.correo);
    await restablecer({ correo: USUARIO_DEMO.correo, codigo: CODIGO_DE_PRUEBA, contrasena: 'NuevaClave2026!' });

    expect(await pedir('GET', '/auth/me', undefined, sesion.tokenAcceso)).toMatchObject({ estado: 401, datos: { codigo: 'SESION_REVOCADA' } });
  });

  test('código incorrecto (400), contraseña corta (400 VALIDACION) y sin haber pedido código (410)', async () => {
    expect((await restablecer({ correo: USUARIO_DEMO.correo, codigo: CODIGO_DE_PRUEBA, contrasena: 'NuevaClave2026!' })).datos.codigo).toBe(
      'CODIGO_EXPIRADO',
    );
    await olvide(USUARIO_DEMO.correo);
    expect((await restablecer({ correo: USUARIO_DEMO.correo, codigo: '000000', contrasena: 'NuevaClave2026!' })).datos.codigo).toBe(
      'CODIGO_INCORRECTO',
    );
    expect(await restablecer({ correo: USUARIO_DEMO.correo, codigo: CODIGO_DE_PRUEBA, contrasena: 'corta' })).toMatchObject({
      estado: 400,
      datos: { codigo: 'VALIDACION', campos: { contrasena: expect.any(String) } },
    });
  });

  test('una cuenta que no existe nunca puede restablecer', async () => {
    await olvide('nadie@empresa.com');

    expect((await restablecer({ correo: 'nadie@empresa.com', codigo: CODIGO_DE_PRUEBA, contrasena: 'NuevaClave2026!' })).estado).toBe(410);
  });
});
