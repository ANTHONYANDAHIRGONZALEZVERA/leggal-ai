import { esquemaUsuario } from '@/features/onboarding/usuario';

import { leerVencimiento } from '../jwt';
import { reiniciarMock, transporteSimulado, USUARIO_DEMO, VIDA_TOKEN_MS } from '../mock';

// API simulada (F11). Debe responder como el backend para que lo probado con
// ella siga valiendo cuando se conecte el servidor real.

/** Hace una petición POST a la API simulada y devuelve estado y cuerpo. */
async function post(ruta: string, cuerpo: Record<string, string>) {
  const r = await transporteSimulado(`https://cualquier.dominio${ruta}`, {
    method: 'POST',
    headers: {},
    body: JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  return { estado: r.status, ok: r.ok, datos: texto ? JSON.parse(texto) : undefined };
}

beforeEach(() => reiniciarMock());

describe('API simulada: inicio de sesión', () => {
  test('el usuario demo entra y recibe sus datos y tokens', async () => {
    const r = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena });

    expect(r.estado).toBe(200);
    expect(r.datos.usuario).toEqual({
      id: 'usr-demo',
      nombre: 'Usuario Demo',
      correo: 'demo@leggal.ai',
      onboardingCompleto: true,
    });
    expect(r.datos.tokens).toEqual({ acceso: expect.any(String), renovacion: expect.any(String) });
    // Nunca devuelve la contraseña.
    expect(JSON.stringify(r.datos)).not.toContain(USUARIO_DEMO.contrasena);
  });

  test('el token de acceso es un JWT con vencimiento, como los del backend', async () => {
    const antes = Date.now();
    const r = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena });

    const vence = leerVencimiento(r.datos.tokens.acceso);
    // "exp" va en segundos: se tolera el redondeo de hasta 1 s.
    expect(vence).toBeGreaterThan(antes + VIDA_TOKEN_MS - 1000);
    expect(vence).toBeLessThanOrEqual(Date.now() + VIDA_TOKEN_MS);
  });

  test('con contraseña incorrecta responde 401 "credenciales inválidas"', async () => {
    const r = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: 'otra' });

    expect(r).toMatchObject({ estado: 401, datos: { codigo: 'CREDENCIALES_INVALIDAS' } });
  });

  test('un correo sin cuenta da el mismo error (no revela qué correos existen)', async () => {
    const malaContrasena = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: 'otra' });
    const sinCuenta = await post('/auth/login', { correo: 'nadie@empresa.com', contrasena: 'otra' });

    expect(sinCuenta).toEqual(malaContrasena);
  });
});

describe('API simulada: registro', () => {
  test('crea la cuenta (201) y después se puede iniciar sesión con ella', async () => {
    const registro = await post('/auth/registro', { nombre: 'Ana Pérez', correo: 'ana@empresa.com', contrasena: 'Leggal2026!' });
    expect(registro.estado).toBe(201);
    // Una cuenta nueva empieza sin onboarding: la app la lleva al paso 1/5.
    expect(registro.datos.usuario).toMatchObject({ nombre: 'Ana Pérez', correo: 'ana@empresa.com', onboardingCompleto: false });

    const login = await post('/auth/login', { correo: 'ana@empresa.com', contrasena: 'Leggal2026!' });
    expect(login.estado).toBe(200);
  });

  test('un correo ya registrado responde 409 y señala el campo correo', async () => {
    const r = await post('/auth/registro', { nombre: 'Otra', correo: USUARIO_DEMO.correo, contrasena: 'Leggal2026!' });

    expect(r).toMatchObject({
      estado: 409,
      datos: { codigo: 'CORREO_EN_USO', campos: { correo: 'Ya existe una cuenta con este correo' } },
    });
  });

  test('reiniciarMock borra las cuentas creadas', async () => {
    await post('/auth/registro', { nombre: 'Ana', correo: 'ana@empresa.com', contrasena: 'Leggal2026!' });
    reiniciarMock();

    const login = await post('/auth/login', { correo: 'ana@empresa.com', contrasena: 'Leggal2026!' });
    expect(login.estado).toBe(401);
  });
});

describe('API simulada: renovación', () => {
  test('cambia un token de renovación válido por tokens nuevos', async () => {
    const { datos } = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena });

    const r = await post('/auth/renovar', { renovacion: datos.tokens.renovacion });

    expect(r.estado).toBe(200);
    expect(r.datos.acceso).not.toBe(datos.tokens.acceso);
  });

  test('cada token de renovación sirve una sola vez', async () => {
    const { datos } = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena });
    await post('/auth/renovar', { renovacion: datos.tokens.renovacion });

    const repetido = await post('/auth/renovar', { renovacion: datos.tokens.renovacion });

    expect(repetido).toMatchObject({ estado: 401, datos: { codigo: 'SESION_EXPIRADA' } });
  });
});

describe('API simulada: cerrar sesión', () => {
  test('responde 204 y el token de renovación deja de servir', async () => {
    const { datos } = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena });

    const salir = await post('/auth/salir', { renovacion: datos.tokens.renovacion });
    expect(salir.estado).toBe(204);

    const renovar = await post('/auth/renovar', { renovacion: datos.tokens.renovacion });
    expect(renovar.estado).toBe(401);
  });
});

test('una ruta que la API simulada no conoce responde 404 explicando cuál falta', async () => {
  const r = await post('/casos', {});

  expect(r).toMatchObject({ estado: 404, datos: { codigo: 'NO_ENCONTRADO', mensaje: expect.stringContaining('POST /casos') } });
});

describe('API simulada: @usuario (F30)', () => {
  /** Inicia sesión con la cuenta demo y devuelve su token de acceso. */
  async function tokenDemo() {
    const { datos } = await post('/auth/login', { correo: USUARIO_DEMO.correo, contrasena: USUARIO_DEMO.contrasena });
    return datos.tokens.acceso as string;
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
