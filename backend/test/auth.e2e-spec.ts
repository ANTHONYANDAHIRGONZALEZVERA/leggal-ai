import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { hashRefresco } from './../src/auth/tokens.service';
import { PrismaService } from './../src/prisma/prisma.service';

// Contrato de autenticación (docs/api/auth.md) contra PostgreSQL real.
// Necesita Docker: docker compose up -d. Cada prueba usa correos únicos del
// dominio de pruebas y al final se borran todos.
const DOMINIO = '@pruebas-e2e.leggal.test';
const CONTRASENA = 'Lunes.Claro.2026';

describe('Autenticación (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;

  const correoNuevo = () => `persona.${randomUUID()}${DOMINIO}`;
  const http = () => request(app.getHttpServer());

  function registrar(correo = correoNuevo(), extra: object = {}) {
    return http()
      .post('/auth/register')
      .set('X-Dispositivo', 'android')
      .set('X-Version-App', '1.0.0')
      .send({
        nombre: 'Andrea Ruiz Mora',
        correo,
        contrasena: CONTRASENA,
        aceptaTerminos: true,
        ...extra,
      });
  }

  const renovar = (tokenRefresco: string, dispositivo = 'android') =>
    http()
      .post('/auth/refresh')
      .set('X-Dispositivo', dispositivo)
      .send({ tokenRefresco });

  /** Simula que el refresh se usó hace `segundos` (para probar la gracia). */
  const usadoHace = (token: string, segundos: number) =>
    prisma.sesion.update({
      where: { hashRefresco: hashRefresco(token) },
      data: { usadoEn: new Date(Date.now() - segundos * 1000) },
    });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    // Borrar los usuarios borra en cascada sus sesiones y aceptaciones.
    await prisma.usuario.deleteMany({
      where: { correo: { endsWith: DOMINIO } },
    });
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('201: crea la cuenta y responde la sesión del contrato', async () => {
      const correo = correoNuevo();
      const { body } = await registrar(`  ${correo.toUpperCase()} `).expect(
        201,
      );

      expect(Object.keys(body).sort()).toEqual([
        'tokenAcceso',
        'tokenRefresco',
        'usuario',
        'venceEn',
      ]);
      expect(body.venceEn).toBe(900);
      expect(body.usuario).toEqual({
        id: expect.any(String),
        nombre: 'Andrea Ruiz Mora',
        nombreVisible: null,
        nombreUsuario: null,
        correo, // recortado y en minúsculas
        correoVerificado: false,
        onboardingCompleto: false,
        creadoEn: expect.any(String),
      });

      const contenido = jwt.verify<Record<string, unknown>>(body.tokenAcceso);
      expect(contenido).toMatchObject({ sub: body.usuario.id, tid: null });
      expect(Number(contenido.exp) - Number(contenido.iat)).toBe(900);
    });

    it('guarda la contraseña con argon2, las 2 aceptaciones y la sesión', async () => {
      const correo = correoNuevo();
      const { body } = await registrar(correo).expect(201);
      const usuario = await prisma.usuario.findUniqueOrThrow({
        where: { correo },
        include: { aceptacionesLegales: true, sesiones: true },
      });

      expect(usuario.hashContrasena).toMatch(/^\$argon2id\$/);
      expect(usuario.hashContrasena).not.toContain(CONTRASENA);
      // La versión la pone el servidor (VERSION_TERMINOS / VERSION_PRIVACIDAD).
      expect(
        usuario.aceptacionesLegales
          .map((a) => `${a.documento}:${a.version}`)
          .sort(),
      ).toEqual([
        `privacidad:${process.env.VERSION_PRIVACIDAD}`,
        `terminos:${process.env.VERSION_TERMINOS}`,
      ]);
      expect(usuario.aceptacionesLegales.every((a) => a.ip !== null)).toBe(
        true,
      );

      const [sesion] = usuario.sesiones;
      expect(usuario.sesiones).toHaveLength(1);
      expect(sesion.dispositivo).toBe('android');
      // Solo el hash: el token en claro nunca toca la base.
      expect(sesion.hashRefresco).toBe(hashRefresco(body.tokenRefresco));
      const sid = jwt.verify<{ sid: string }>(body.tokenAcceso).sid;
      expect(sid).toBe(sesion.familiaId);
    });

    it('409 CORREO_EN_USO con un correo que ya existe (sin importar mayúsculas)', async () => {
      const correo = correoNuevo();
      await registrar(correo).expect(201);
      const { body } = await registrar(correo.toUpperCase()).expect(409);
      expect(body).toEqual({
        codigo: 'CORREO_EN_USO',
        mensaje:
          'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
        campos: null,
      });
    });

    it('400 VALIDACION sin aceptar los términos, y no crea la cuenta', async () => {
      const correo = correoNuevo();
      const { body } = await registrar(correo, {
        aceptaTerminos: false,
      }).expect(400);
      expect(body.codigo).toBe('VALIDACION');
      expect(body.campos).toHaveProperty('aceptaTerminos');
      expect(await prisma.usuario.count({ where: { correo } })).toBe(0);
    });

    it('400 VALIDACION si el cuerpo trae un tenantId (la empresa sale del token)', async () => {
      const { body } = await registrar(correoNuevo(), {
        tenantId: randomUUID(),
      }).expect(400);
      expect(body.campos).toEqual({ tenantId: 'Este campo no está permitido' });
    });
  });

  describe('POST /auth/login', () => {
    const login = (correo: string, contrasena = CONTRASENA) =>
      http().post('/auth/login').send({ correo, contrasena });

    it('200: abre una sesión nueva (otra familia, otro sid)', async () => {
      const correo = correoNuevo();
      const registro = await registrar(correo).expect(201);
      const { body } = await login(` ${correo.toUpperCase()}`).expect(200);

      expect(body.usuario).toEqual(registro.body.usuario);
      const sidRegistro = jwt.verify<{ sid: string }>(
        registro.body.tokenAcceso,
      ).sid;
      const sidLogin = jwt.verify<{ sid: string }>(body.tokenAcceso).sid;
      expect(sidLogin).not.toBe(sidRegistro);
    });

    it('permite entrar con el correo sin verificar', async () => {
      const correo = correoNuevo();
      await registrar(correo).expect(201);
      const { body } = await login(correo).expect(200);
      expect(body.usuario.correoVerificado).toBe(false);
    });

    it('401 CREDENCIALES_INVALIDAS idéntico para clave mala, correo inexistente y cuenta solo de Google', async () => {
      const correo = correoNuevo();
      await registrar(correo).expect(201);
      const correoGoogle = correoNuevo();
      await prisma.usuario.create({
        data: {
          correo: correoGoogle,
          nombre: 'Solo Google',
          hashContrasena: null,
        },
      });

      const respuestas = await Promise.all([
        login(correo, 'otra-clave'),
        login(correoNuevo()),
        login(correoGoogle),
      ]);
      for (const respuesta of respuestas) {
        expect(respuesta.status).toBe(401);
        expect(respuesta.body).toEqual({
          codigo: 'CREDENCIALES_INVALIDAS',
          mensaje: 'El correo o la contraseña no son correctos.',
          campos: null,
        });
      }
    });

    it('403 USUARIO_INACTIVO si la cuenta está suspendida (con la clave correcta)', async () => {
      const correo = correoNuevo();
      await registrar(correo).expect(201);
      await prisma.usuario.update({
        where: { correo },
        data: { estado: 'suspendido' },
      });
      expect((await login(correo).expect(403)).body.codigo).toBe(
        'USUARIO_INACTIVO',
      );
      // Con la clave mala sigue siendo 401: suspendida no revela que existe.
      expect((await login(correo, 'otra').expect(401)).body.codigo).toBe(
        'CREDENCIALES_INVALIDAS',
      );
    });
  });

  describe('POST /auth/refresh', () => {
    it('200: rota el refresh y conserva el sid de la familia', async () => {
      const { body: inicial } = await registrar().expect(201);
      const { body: nuevo } = await renovar(inicial.tokenRefresco).expect(200);

      expect(nuevo.tokenRefresco).not.toBe(inicial.tokenRefresco);
      expect(nuevo.usuario).toEqual(inicial.usuario);
      const sidAntes = jwt.verify<{ sid: string }>(inicial.tokenAcceso).sid;
      const sidDespues = jwt.verify<{ sid: string; tid: null }>(
        nuevo.tokenAcceso,
      );
      expect(sidDespues).toMatchObject({ sid: sidAntes, tid: null });

      // El nuevo también sirve: la cadena de rotación sigue.
      await renovar(nuevo.tokenRefresco).expect(200);
    });

    it('gracia: reenviar el refresh anterior dentro de 30 s da un par nuevo, aunque cambie el dispositivo', async () => {
      const { body: inicial } = await registrar().expect(201);
      const { body: perdido } = await renovar(inicial.tokenRefresco).expect(
        200,
      );

      // La respuesta anterior "se perdió": la app reenvía el refresh viejo.
      const { body: rescate } = await renovar(
        inicial.tokenRefresco,
        'web',
      ).expect(200);
      const sid = jwt.verify<{ sid: string }>(inicial.tokenAcceso).sid;
      expect(jwt.verify<{ sid: string }>(rescate.tokenAcceso).sid).toBe(sid);
      // El par que se perdió queda sin efecto; el nuevo sí funciona.
      expect(rescate.tokenRefresco).not.toBe(perdido.tokenRefresco);
      await renovar(rescate.tokenRefresco).expect(200);
    });

    it('fuera de la gracia: 401 SESION_REVOCADA y se cierran TODAS las sesiones', async () => {
      const correo = correoNuevo();
      const { body: telefono } = await registrar(correo).expect(201);
      const { body: computadora } = await http()
        .post('/auth/login')
        .send({ correo, contrasena: CONTRASENA })
        .expect(200);

      await renovar(telefono.tokenRefresco).expect(200);
      await usadoHace(telefono.tokenRefresco, 31);

      const { body } = await renovar(telefono.tokenRefresco).expect(401);
      expect(body.codigo).toBe('SESION_REVOCADA');
      // La otra sesión (otra familia) también quedó cerrada.
      expect(
        (await renovar(computadora.tokenRefresco).expect(401)).body.codigo,
      ).toBe('SESION_REVOCADA');
      const abiertas = await prisma.sesion.count({
        where: { usuario: { correo }, revocadoEn: null },
      });
      expect(abiertas).toBe(0);
    });

    it('dos refresh simultáneos con el mismo token: ambos reciben un par (no se toma como robo)', async () => {
      const { body: inicial } = await registrar().expect(201);
      const [a, b] = await Promise.all([
        renovar(inicial.tokenRefresco),
        renovar(inicial.tokenRefresco),
      ]);
      expect([a.status, b.status]).toEqual([200, 200]);
    });

    it('401 REFRESCO_INVALIDO con un token que no existe', async () => {
      const { body } = await renovar('token-que-nunca-existio').expect(401);
      expect(body).toEqual({
        codigo: 'REFRESCO_INVALIDO',
        mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.',
        campos: null,
      });
    });

    it('401 REFRESCO_INVALIDO con un token vencido', async () => {
      const { body: inicial } = await registrar().expect(201);
      await prisma.sesion.update({
        where: { hashRefresco: hashRefresco(inicial.tokenRefresco) },
        data: { venceEn: new Date(Date.now() - 1000) },
      });
      expect(
        (await renovar(inicial.tokenRefresco).expect(401)).body.codigo,
      ).toBe('REFRESCO_INVALIDO');
    });

    it('cuenta suspendida con la sesión abierta: 401 SESION_REVOCADA', async () => {
      const correo = correoNuevo();
      const { body: inicial } = await registrar(correo).expect(201);
      await prisma.usuario.update({
        where: { correo },
        data: { estado: 'suspendido' },
      });
      expect(
        (await renovar(inicial.tokenRefresco).expect(401)).body.codigo,
      ).toBe('SESION_REVOCADA');
    });

    it('el refresh de una persona nunca devuelve los datos de otra', async () => {
      const { body: ana } = await registrar().expect(201);
      const { body: luis } = await registrar().expect(201);
      const { body } = await renovar(ana.tokenRefresco).expect(200);
      expect(body.usuario.id).toBe(ana.usuario.id);
      expect(body.usuario.id).not.toBe(luis.usuario.id);
    });
  });
});
