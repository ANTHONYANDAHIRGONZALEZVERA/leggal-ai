import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

// B11: GET /auth/me, POST /auth/logout y el guard del token de acceso, contra
// PostgreSQL real (docker compose up -d). Correos y empresas de prueba únicos;
// al final se borran todos.
const DOMINIO = '@pruebas-b11.leggal.test';
const PREFIJO_EMPRESA = 'Empresa de prueba B11';

describe('Sesión: /auth/me y /auth/logout (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;

  const http = () => request(app.getHttpServer());
  const correoNuevo = () => `persona.${randomUUID()}${DOMINIO}`;

  async function registrar(correo = correoNuevo()) {
    const { body } = await http()
      .post('/auth/register')
      .send({
        nombre: 'Andrea Ruiz Mora',
        correo,
        contrasena: 'Lunes.Claro.2026',
        aceptaTerminos: true,
      })
      .expect(201);
    return body as {
      tokenAcceso: string;
      tokenRefresco: string;
      usuario: { id: string };
    };
  }

  const yo = (token?: string) => {
    const peticion = http().get('/auth/me');
    return token ? peticion.set('Authorization', `Bearer ${token}`) : peticion;
  };
  const salir = (token: string) =>
    http().post('/auth/logout').set('Authorization', `Bearer ${token}`);

  /** Crea una empresa con un rol y una membresía de la persona en ese estado. */
  async function membresia(
    usuarioId: string,
    estado: 'activa' | 'en_espera' | 'rechazada' | 'suspendida',
    rolNombre = 'Abogado',
  ) {
    const empresa = await prisma.empresa.create({
      data: { nombre: `${PREFIJO_EMPRESA} ${estado} ${randomUUID()}` },
    });
    const rol = await prisma.rol.create({
      data: { tenantId: empresa.id, nombre: rolNombre },
    });
    await prisma.membresia.create({
      data: {
        tenantId: empresa.id,
        usuarioId,
        rolId: rol.id,
        estado,
        origen: 'codigo',
      },
    });
    return empresa;
  }

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
    // Las empresas borran en cascada sus roles y membresías; los usuarios, sus
    // sesiones y aceptaciones.
    await prisma.empresa.deleteMany({
      where: { nombre: { startsWith: PREFIJO_EMPRESA } },
    });
    await prisma.usuario.deleteMany({
      where: { correo: { endsWith: DOMINIO } },
    });
    await app.close();
  });

  describe('GET /auth/me', () => {
    it('200: el mismo objeto usuario del registro, sin empresa activa ni empresas', async () => {
      const sesion = await registrar();
      const { body } = await yo(sesion.tokenAcceso).expect(200);
      expect(body).toEqual({
        usuario: sesion.usuario,
        empresaActivaId: null,
        empresas: [],
      });
    });

    it('lista solo las membresías activas y en espera, con el nombre del rol', async () => {
      const sesion = await registrar();
      const id = sesion.usuario.id;
      const activa = await membresia(id, 'activa', 'Administrador');
      const enEspera = await membresia(id, 'en_espera', 'Abogado');
      await membresia(id, 'rechazada');
      await membresia(id, 'suspendida');

      const { body } = await yo(sesion.tokenAcceso).expect(200);
      expect(body.empresas).toEqual([
        {
          id: activa.id,
          nombre: activa.nombre,
          tipo: 'empresa',
          rol: 'Administrador',
          estadoMembresia: 'activa',
        },
        {
          id: enEspera.id,
          nombre: enEspera.nombre,
          tipo: 'empresa',
          rol: 'Abogado',
          estadoMembresia: 'en_espera',
        },
      ]);
    });

    it('aislamiento: nunca muestra las empresas de otra persona', async () => {
      const ana = await registrar();
      const luis = await registrar();
      await membresia(luis.usuario.id, 'activa');

      const { body } = await yo(ana.tokenAcceso).expect(200);
      expect(body.usuario.id).toBe(ana.usuario.id);
      expect(body.empresas).toEqual([]);
    });

    it('401 NO_AUTENTICADO sin la cabecera Authorization', async () => {
      const { body } = await yo().expect(401);
      expect(body).toEqual({
        codigo: 'NO_AUTENTICADO',
        mensaje: 'Inicia sesión para continuar.',
        campos: null,
      });
    });

    it('401 TOKEN_INVALIDO con un token alterado', async () => {
      const { tokenAcceso } = await registrar();
      const [cabecera, contenido] = tokenAcceso.split('.');
      const alterado = `${cabecera}.${contenido}.firmaInventada`;
      expect((await yo(alterado).expect(401)).body.codigo).toBe(
        'TOKEN_INVALIDO',
      );
    });

    it('401 TOKEN_EXPIRADO con un token vencido', async () => {
      const { tokenAcceso } = await registrar();
      const { sub, tid, sid } = jwt.decode<{
        sub: string;
        tid: null;
        sid: string;
      }>(tokenAcceso);
      const vencido = jwt.sign({ sub, tid, sid }, { expiresIn: -60 });
      expect((await yo(vencido).expect(401)).body.codigo).toBe(
        'TOKEN_EXPIRADO',
      );
    });

    it('403 USUARIO_INACTIVO si la cuenta se suspende con la sesión abierta', async () => {
      const correo = correoNuevo();
      const { tokenAcceso } = await registrar(correo);
      await prisma.usuario.update({
        where: { correo },
        data: { estado: 'suspendido' },
      });
      expect((await yo(tokenAcceso).expect(403)).body.codigo).toBe(
        'USUARIO_INACTIVO',
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('204 y el token de acceso deja de servir en el acto, aunque no haya vencido', async () => {
      const sesion = await registrar();
      await yo(sesion.tokenAcceso).expect(200);

      await salir(sesion.tokenAcceso).expect(204);

      expect((await yo(sesion.tokenAcceso).expect(401)).body.codigo).toBe(
        'SESION_REVOCADA',
      );
      // El refresh de esa sesión tampoco sirve.
      const refresh = await http()
        .post('/auth/refresh')
        .send({ tokenRefresco: sesion.tokenRefresco })
        .expect(401);
      expect(refresh.body.codigo).toBe('SESION_REVOCADA');
    });

    it('revoca la familia completa: también el refresh rotado de esa sesión', async () => {
      const sesion = await registrar();
      const { body: rotada } = await http()
        .post('/auth/refresh')
        .send({ tokenRefresco: sesion.tokenRefresco })
        .expect(200);

      await salir(rotada.tokenAcceso).expect(204);

      const refresh = await http()
        .post('/auth/refresh')
        .send({ tokenRefresco: rotada.tokenRefresco })
        .expect(401);
      expect(refresh.body.codigo).toBe('SESION_REVOCADA');
    });

    it('logout con token vencido → 204 y el refresh queda revocado (401 SESION_REVOCADA)', async () => {
      const sesion = await registrar();
      // Mismo usuario y sesión real, pero el token de acceso venció hace una hora.
      const { sub, tid, sid } = jwt.decode<{
        sub: string;
        tid: null;
        sid: string;
      }>(sesion.tokenAcceso);
      const vencido = jwt.sign({ sub, tid, sid }, { expiresIn: -3600 });

      // /me sigue rechazando el token vencido: solo el logout lo acepta.
      expect((await yo(vencido).expect(401)).body.codigo).toBe(
        'TOKEN_EXPIRADO',
      );

      await salir(vencido).expect(204);

      const refresh = await http()
        .post('/auth/refresh')
        .send({ tokenRefresco: sesion.tokenRefresco })
        .expect(401);
      expect(refresh.body.codigo).toBe('SESION_REVOCADA');
      // Y el token de acceso que todavía no vencía tampoco sirve ya.
      expect((await yo(sesion.tokenAcceso).expect(401)).body.codigo).toBe(
        'SESION_REVOCADA',
      );
    });

    it('logout con token vencido pero firma falsa → 401 TOKEN_INVALIDO y la sesión sigue abierta', async () => {
      const sesion = await registrar();
      const { sub, tid, sid } = jwt.decode<{
        sub: string;
        tid: null;
        sid: string;
      }>(sesion.tokenAcceso);
      const falso = new JwtService({ secret: 'y'.repeat(48) }).sign(
        { sub, tid, sid },
        { expiresIn: -3600 },
      );

      expect((await salir(falso).expect(401)).body.codigo).toBe(
        'TOKEN_INVALIDO',
      );
      await yo(sesion.tokenAcceso).expect(200);
    });

    it('es idempotente: un segundo logout con el mismo token también da 204', async () => {
      const { tokenAcceso } = await registrar();
      await salir(tokenAcceso).expect(204);
      await salir(tokenAcceso).expect(204);
    });

    it('solo cierra esta sesión: la de otro dispositivo sigue abierta', async () => {
      const correo = correoNuevo();
      const telefono = await registrar(correo);
      const { body: computadora } = await http()
        .post('/auth/login')
        .send({ correo, contrasena: 'Lunes.Claro.2026' })
        .expect(200);

      await salir(telefono.tokenAcceso).expect(204);

      await yo(computadora.tokenAcceso).expect(200);
    });

    it('401 sin token (la app cierra la sesión local igual)', async () => {
      const { body } = await http().post('/auth/logout').expect(401);
      expect(body.codigo).toBe('NO_AUTENTICADO');
    });
  });

  describe('JSON mal formado (nota de revisión de Anthony)', () => {
    it.each(['/auth/login', '/auth/register', '/auth/refresh'])(
      '%s responde 400 SOLICITUD_INVALIDA con campos: null',
      async (ruta) => {
        const { body } = await http()
          .post(ruta)
          .set('Content-Type', 'application/json')
          .send('{"correo": "ana@ejemplo.com", ')
          .expect(400);
        expect(body).toEqual({
          codigo: 'SOLICITUD_INVALIDA',
          mensaje: 'La petición no tiene un formato válido.',
          campos: null,
        });
      },
    );

    it('un cuerpo válido pero con datos malos sigue siendo VALIDACION con campos', async () => {
      const { body } = await http()
        .post('/auth/login')
        .send({ correo: 'no-es-correo', contrasena: 'x' })
        .expect(400);
      expect(body.codigo).toBe('VALIDACION');
      expect(body.campos).toHaveProperty('correo');
    });
  });
});
