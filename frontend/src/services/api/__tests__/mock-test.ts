import { esquemaUsuario } from '@/features/onboarding/usuario';

import { leerCarga, leerVencimiento } from '../jwt';
import { reiniciarMock, transporteSimulado, USUARIO_DEMO, VIDA_TOKEN_MS } from '../mock';

// API simulada (F11). Debe responder como el backend según su contrato (B03,
// docs/api/auth.md) para que lo probado con ella siga valiendo con el servidor real.

// datos es "any": cada prueba lee los campos que espera de la respuesta.
type Respuesta = { estado: number; ok: boolean; datos: any };

/** Hace una petición a la API simulada y devuelve estado y cuerpo. */
async function pedir(metodo: string, ruta: string, cuerpo?: object, token?: string): Promise<Respuesta> {
  const r = await transporteSimulado(`https://cualquier.dominio${ruta}`, {
    method: metodo,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  return { estado: r.status, ok: r.ok, datos: texto ? JSON.parse(texto) : undefined };
}

const post = (ruta: string, cuerpo: object = {}, token?: string) => pedir('POST', ruta, cuerpo, token);
const entrarDemo = () => post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena });
const REGISTRO = { nombre: 'Ana Pérez', correo: 'ana@empresa.com', contrasena: 'Leggal2026!', aceptaTerminos: true };

beforeEach(() => reiniciarMock());

describe('API simulada: inicio de sesión', () => {
  test('el usuario demo entra con la respuesta de sesión del contrato', async () => {
    const r = await entrarDemo();

    expect(r.estado).toBe(200);
    expect(r.datos).toEqual({
      tokenAcceso: expect.any(String),
      tokenRefresco: expect.any(String),
      venceEn: 900,
      usuario: {
        id: 'usr-demo',
        nombre: 'Usuario Demo',
        nombreVisible: 'Usuario Demo',
        nombreUsuario: 'usuario.demo',
        correo: 'demo@leggal.ai',
        correoVerificado: true,
        onboardingCompleto: true,
        creadoEn: '2026-11-11T00:00:00.000Z',
      },
    });
    // Nunca devuelve la contraseña.
    expect(JSON.stringify(r.datos)).not.toContain(USUARIO_DEMO.contrasena);
  });

  test('el token de acceso es un JWT de 15 minutos con sub, tid y sid', async () => {
    const antes = Date.now();
    const { datos } = await entrarDemo();

    expect(leerCarga(datos.tokenAcceso)).toMatchObject({ sub: 'usr-demo', tid: null, sid: expect.any(String) });
    const vence = leerVencimiento(datos.tokenAcceso);
    // "exp" va en segundos: se tolera el redondeo de hasta 1 s.
    expect(vence).toBeGreaterThan(antes + VIDA_TOKEN_MS - 1000);
    expect(vence).toBeLessThanOrEqual(Date.now() + VIDA_TOKEN_MS);
  });

  test('con contraseña incorrecta responde 401 CREDENCIALES_INVALIDAS con el formato de error', async () => {
    const r = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: 'otra' });

    expect(r).toMatchObject({
      estado: 401,
      datos: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: expect.any(String), campos: null },
    });
  });

  test('un correo sin cuenta da el mismo error (no revela qué correos existen)', async () => {
    const malaContrasena = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: 'otra' });
    const sinCuenta = await post('/auth/login', { correo: 'nadie@empresa.com', contrasena: 'otra' });

    expect(sinCuenta).toEqual(malaContrasena);
  });
});

describe('API simulada: registro', () => {
  test('crea la cuenta (201) sin verificar ni onboarding, y después se puede iniciar sesión', async () => {
    const registro = await post('/auth/register', REGISTRO);

    expect(registro.estado).toBe(201);
    expect(registro.datos.usuario).toMatchObject({
      nombre: 'Ana Pérez',
      nombreVisible: null,
      nombreUsuario: null,
      correo: 'ana@empresa.com',
      correoVerificado: false,
      onboardingCompleto: false,
    });
    expect(registro.datos.tokenRefresco).toEqual(expect.any(String));

    const login = await post('/auth/login', { correo: REGISTRO.correo, contrasena: REGISTRO.contrasena });
    expect(login.estado).toBe(200);
  });

  test('un correo ya registrado responde 409 CORREO_EN_USO sin campos', async () => {
    const r = await post('/auth/register', { ...REGISTRO, correo: USUARIO_DEMO.correo });

    expect(r).toMatchObject({ estado: 409, datos: { codigo: 'CORREO_EN_USO', campos: null } });
  });

  test('sin aceptar los términos responde 400 VALIDACION señalando el campo', async () => {
    const r = await post('/auth/register', { ...REGISTRO, aceptaTerminos: false });

    expect(r).toMatchObject({
      estado: 400,
      datos: { codigo: 'VALIDACION', campos: { aceptaTerminos: expect.any(String) } },
    });
  });

  test('reiniciarMock borra las cuentas creadas', async () => {
    await post('/auth/register', REGISTRO);
    reiniciarMock();

    const login = await post('/auth/login', { correo: REGISTRO.correo, contrasena: REGISTRO.contrasena });
    expect(login.estado).toBe(401);
  });
});

describe('API simulada: refresh', () => {
  test('cambia un tokenRefresco válido por una sesión nueva de la misma sesión (sid)', async () => {
    const { datos } = await entrarDemo();

    const r = await post('/auth/refresh', { tokenRefresco: datos.tokenRefresco });

    expect(r.estado).toBe(200);
    expect(r.datos.tokenAcceso).not.toBe(datos.tokenAcceso);
    expect(r.datos.tokenRefresco).not.toBe(datos.tokenRefresco);
    expect(r.datos.usuario.id).toBe('usr-demo');
    expect(leerCarga(r.datos.tokenAcceso)?.sid).toBe(leerCarga(datos.tokenAcceso)?.sid);
  });

  test('un tokenRefresco que no existe responde 401 REFRESCO_INVALIDO', async () => {
    const r = await post('/auth/refresh', { tokenRefresco: 'inventado' });

    expect(r).toMatchObject({ estado: 401, datos: { codigo: 'REFRESCO_INVALIDO' } });
  });

  test('reusar un tokenRefresco ya usado se toma como robo y cierra todas las sesiones', async () => {
    const telefono = (await entrarDemo()).datos;
    const otroEquipo = (await entrarDemo()).datos;
    await post('/auth/refresh', { tokenRefresco: telefono.tokenRefresco });

    const repetido = await post('/auth/refresh', { tokenRefresco: telefono.tokenRefresco });

    expect(repetido).toMatchObject({ estado: 401, datos: { codigo: 'SESION_REVOCADA' } });
    // La otra sesión de la misma persona también quedó cerrada.
    const otro = await post('/auth/refresh', { tokenRefresco: otroEquipo.tokenRefresco });
    expect(otro).toMatchObject({ estado: 401, datos: { codigo: 'SESION_REVOCADA' } });
  });
});

describe('API simulada: logout y me', () => {
  test('logout (con Bearer) responde 204 y cierra solo esa sesión', async () => {
    const telefono = (await entrarDemo()).datos;
    const otroEquipo = (await entrarDemo()).datos;

    const salir = await post('/auth/logout', undefined, telefono.tokenAcceso);
    expect(salir.estado).toBe(204);

    expect((await post('/auth/refresh', { tokenRefresco: telefono.tokenRefresco })).estado).toBe(401);
    expect((await post('/auth/refresh', { tokenRefresco: otroEquipo.tokenRefresco })).estado).toBe(200);
  });

  test('logout es idempotente y sin token responde 401 NO_AUTENTICADO', async () => {
    const { datos } = await entrarDemo();

    await post('/auth/logout', undefined, datos.tokenAcceso);
    expect((await post('/auth/logout', undefined, datos.tokenAcceso)).estado).toBe(204);
    expect(await post('/auth/logout')).toMatchObject({ estado: 401, datos: { codigo: 'NO_AUTENTICADO' } });
  });

  test('me devuelve el usuario y sus empresas (la demo ya es Administrador de ACCONS)', async () => {
    const { datos } = await entrarDemo();

    const r = await pedir('GET', '/auth/me', undefined, datos.tokenAcceso);

    expect(r).toMatchObject({
      estado: 200,
      datos: {
        usuario: { id: 'usr-demo', correo: 'demo@leggal.ai' },
        empresaActivaId: null,
        empresas: [{ id: 'emp-accons', nombre: 'ACCONS S.A.S.', tipo: 'empresa', rol: 'Administrador', estadoMembresia: 'activa' }],
      },
    });
  });

  test('me con una sesión cerrada responde 401 SESION_REVOCADA', async () => {
    const { datos } = await entrarDemo();
    await post('/auth/logout', undefined, datos.tokenAcceso);

    const r = await pedir('GET', '/auth/me', undefined, datos.tokenAcceso);

    expect(r).toMatchObject({ estado: 401, datos: { codigo: 'SESION_REVOCADA' } });
  });
});

test('una ruta que la API simulada no conoce responde 404 explicando cuál falta', async () => {
  const r = await post('/casos');

  expect(r).toMatchObject({ estado: 404, datos: { codigo: 'NO_ENCONTRADO', mensaje: expect.stringContaining('POST /casos') } });
});

describe('API simulada: @usuario (F30)', () => {
  /** Inicia sesión con la cuenta demo y devuelve su token de acceso. */
  async function tokenDemo() {
    const { datos } = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena });
    return datos.tokenAcceso as string;
  }

  async function get(ruta: string, token?: string) {
    const r = await transporteSimulado(ruta, { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { estado: r.status, datos: JSON.parse(await r.text()) };
  }

  const disponible = (usuario: string, token?: string) => get(`/usuarios/disponible?usuario=${encodeURIComponent(usuario)}`, token);
  const sugerencias = async (nombre: string) =>
    (await get(`/usuarios/sugerencias?nombre=${encodeURIComponent(nombre)}`, await tokenDemo())).datos.sugerencias as string[];

  test('son rutas privadas: sin token o con un token falso responden 401', async () => {
    expect((await disponible('ana.perez')).estado).toBe(401);
    expect((await disponible('ana.perez', 'token-inventado')).estado).toBe(401);
    expect((await get('/usuarios/sugerencias?nombre=Ana')).estado).toBe(401);
  });

  test('un @usuario libre responde disponible y uno tomado no', async () => {
    const token = await tokenDemo();

    expect((await disponible('usuario.nuevo', token)).datos).toEqual({ usuario: 'usuario.nuevo', disponible: true });
    expect((await disponible('andrea.ruiz', token)).datos.disponible).toBe(false);
  });

  test('sugiere a partir del nombre escrito, sin tildes y sin los tomados', async () => {
    // andrea.ruiz está tomado, así que no aparece.
    expect(await sugerencias('Andréa Ruíz')).toEqual(['aruiz.legal', 'andrearuiz', 'ruiz.andrea']);
  });

  test('con un solo nombre también sugiere', async () => {
    expect(await sugerencias('Bruno')).toEqual(['bruno', 'bruno.legal', 'bruno.abogado']);
  });

  test('nunca repite una sugerencia', async () => {
    // "Ana Ana" haría ana.ana dos veces; solo debe aparecer una.
    const lista = await sugerencias('Ana Ana');

    expect(new Set(lista).size).toBe(lista.length);
  });

  test('todas las sugerencias cumplen las reglas del @usuario', async () => {
    for (const nombre of ['María José Pérez', "D'Angelo O'Brien", 'Ñandú', 'Bartolomeo Maximiliano Fernandezdelgado']) {
      for (const s of await sugerencias(nombre)) expect(esquemaUsuario.safeParse(s).success).toBe(true);
    }
  });

  test('sin nombre no sugiere nada', async () => {
    expect(await sugerencias('   ')).toEqual([]);
  });
});

describe('API simulada: recargar la app', () => {
  // El mock olvida las sesiones al recargar (reiniciarMock hace lo mismo); el
  // backend real no. Un refresco de una ejecución anterior sigue sirviendo.
  test('un tokenRefresco de antes de recargar sigue sirviendo, una sola vez', async () => {
    const { datos } = await entrarDemo();
    reiniciarMock();

    const r = await post('/auth/refresh', { tokenRefresco: datos.tokenRefresco });
    expect(r.estado).toBe(200);
    expect(r.datos.usuario.id).toBe('usr-demo');

    const repetido = await post('/auth/refresh', { tokenRefresco: datos.tokenRefresco });
    expect(repetido).toMatchObject({ estado: 401, datos: { codigo: 'SESION_REVOCADA' } });
  });

  test('si la cuenta ya no existe (registrada antes de recargar), responde REFRESCO_INVALIDO', async () => {
    const { datos } = await post('/auth/register', REGISTRO);
    reiniciarMock();

    const r = await post('/auth/refresh', { tokenRefresco: datos.tokenRefresco });
    expect(r).toMatchObject({ estado: 401, datos: { codigo: 'REFRESCO_INVALIDO' } });
  });
});
