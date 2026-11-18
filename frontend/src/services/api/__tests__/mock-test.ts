import { reiniciarMock, transporteSimulado, USUARIO_DEMO } from '../mock';

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
    expect(r.datos.usuario).toEqual({ id: 'usr-demo', nombre: 'Usuario Demo', correo: 'demo@leggal.ai' });
    expect(r.datos.tokens).toEqual({ acceso: expect.any(String), renovacion: expect.any(String) });
    // Nunca devuelve la contraseña.
    expect(JSON.stringify(r.datos)).not.toContain(USUARIO_DEMO.contrasena);
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
    expect(registro.datos.usuario).toMatchObject({ nombre: 'Ana Pérez', correo: 'ana@empresa.com' });

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

test('una ruta que la API simulada no conoce responde 404 explicando cuál falta', async () => {
  const r = await post('/casos', {});

  expect(r).toMatchObject({ estado: 404, datos: { codigo: 'NO_ENCONTRADO', mensaje: expect.stringContaining('POST /casos') } });
});
