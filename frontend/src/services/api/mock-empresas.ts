import type { EmpresaResumen, RolAsignado, SolicitudAcceso, VistaPreviaCodigo } from '@/features/empresas/contrato';
import { TAMANOS_EQUIPO } from '@/features/empresas/contrato';

import type { RespuestaTransporte } from './cliente';
import type { EmpresaApi, RespuestaSesionApi } from './contrato';

// Empresas, códigos y solicitudes de la API simulada (B35 y B39), según la
// propuesta de docs/api/empresas-borrador-frontend.md. La usa mock.ts.

type Cuerpo = Record<string, unknown>;
type Persona = { id: string };

/** Lo que mock.ts le presta: respuestas con el formato del contrato y sesiones nuevas. */
export type Herramientas = {
  responder: (estado: number, cuerpo?: unknown) => RespuestaTransporte;
  fallar: (estado: number, codigo: string, mensaje: string, campos?: Record<string, string> | null) => RespuestaTransporte;
  /** Sesión nueva de la persona con su token ya dentro de la empresa (tid). */
  sesionEnEmpresa: (persona: Persona, empresaId: string) => RespuestaSesionApi;
};

/** Códigos de prueba (los del diseño). Se escriben con o sin guion. */
export const CODIGOS_DE_PRUEBA = {
  /** ACCONS S.A.S., verificada, rol Abogado/a, requiere aprobación. */
  accons: 'ACC-7K2',
  /** Estudio sin verificar, rol Asistente legal. Su "administrador" aprueba solo a los 40 s. */
  estudio: 'LEX-4P9',
  /** Entra directo, sin aprobación (la empresa no la pide). */
  directo: 'DIR-8M3',
  /** Vencido: ya no sirve. */
  vencido: 'OLD-2X1',
} as const;

/** RUC que ya está registrado en la API simulada. */
export const RUC_TOMADO = '1790012345001';

/** Intentos de vista previa o canje por persona y por hora (B39). */
export const INTENTOS_POR_HORA = 5;
const HORA_MS = 60 * 60 * 1000;

type Invitacion = {
  empresa: EmpresaResumen;
  rol: RolAsignado;
  requiereAprobacion: boolean;
  vencida?: boolean;
  /** Solo la API simulada: aprueba sola la solicitud pasado este tiempo, para verlo en la app. */
  aprobarTrasMs?: number;
};

/** Cuánto tarda en aprobarse sola una solicitud con `LEX-4P9`. */
export const APROBAR_LEX_TRAS_MS = 40_000;

const INVITACIONES: Record<string, Invitacion> = {
  ACC7K2: {
    empresa: { id: 'emp-accons', nombre: 'ACCONS S.A.S.', verificada: true },
    rol: { codigo: 'abogado', nombre: 'Abogado/a' },
    requiereAprobacion: true,
  },
  LEX4P9: {
    empresa: {
      id: 'emp-lex',
      nombre: 'Estudio Lex & Asociados',
      verificada: false,
    },
    rol: { codigo: 'asistente_legal', nombre: 'Asistente legal' },
    requiereAprobacion: true,
    aprobarTrasMs: APROBAR_LEX_TRAS_MS,
  },
  DIR8M3: {
    empresa: { id: 'emp-andina', nombre: 'Consultora Jurídica Andina', verificada: true },
    rol: { codigo: 'abogado', nombre: 'Abogado/a' },
    requiereAprobacion: false,
  },
  OLD2X1: {
    empresa: { id: 'emp-vieja', nombre: 'Empresa Antigua', verificada: false },
    rol: { codigo: 'otro', nombre: 'Otro' },
    requiereAprobacion: true,
    vencida: true,
  },
};

let solicitudes: (SolicitudAcceso & { usuarioId: string })[] = [];
let intentos = new Map<string, number[]>();
let rucs = new Set<string>();
/** Espacio personal de cada persona (uno solo: crearlo otra vez devuelve el mismo). */
let personales = new Map<string, string>();
/** Empresas creadas en "Crear empresa": su creador queda como Administrador. */
let creadas: { usuarioId: string; empresa: EmpresaResumen }[] = [];
let contador = 0;

/** Id de la cuenta demo de mock.ts: ya es Administrador de ACCONS. */
const ID_DEMO = 'usr-demo';
const ACCONS: EmpresaApi = {
  id: 'emp-accons',
  nombre: 'ACCONS S.A.S.',
  tipo: 'empresa',
  rol: 'Administrador',
  estadoMembresia: 'activa',
};

/**
 * Empresas de la persona para GET /auth/me (contrato B03): solo membresías
 * `activa` o `en_espera`. Las rechazadas o canceladas no aparecen.
 */
export function empresasDe(usuarioId: string): EmpresaApi[] {
  const lista: EmpresaApi[] = usuarioId === ID_DEMO ? [ACCONS] : [];
  const personal = personales.get(usuarioId);
  if (personal) {
    lista.push({ id: personal, nombre: 'Espacio personal', tipo: 'personal', rol: 'Administrador', estadoMembresia: 'activa' });
  }
  for (const { empresa } of creadas.filter((c) => c.usuarioId === usuarioId)) {
    lista.push({ id: empresa.id, nombre: empresa.nombre, tipo: 'empresa', rol: 'Administrador', estadoMembresia: 'activa' });
  }
  for (const s of solicitudes.filter((s) => s.usuarioId === usuarioId)) {
    if (s.estado !== 'aprobada' && s.estado !== 'en_espera') continue;
    lista.push({
      id: s.empresa.id,
      nombre: s.empresa.nombre,
      tipo: 'empresa',
      rol: s.rol.nombre,
      estadoMembresia: s.estado === 'aprobada' ? 'activa' : 'en_espera',
    });
  }
  return lista;
}

export function reiniciarEmpresas() {
  solicitudes = [];
  intentos = new Map();
  rucs = new Set([RUC_TOMADO]);
  personales = new Map();
  creadas = [];
  contador = 0;
}
reiniciarEmpresas();

/** Solo pruebas: simula la respuesta del administrador a una solicitud (B40). */
export function decidirSolicitud(id: string, estado: 'aprobada' | 'rechazada') {
  const solicitud = solicitudes.find((s) => s.id === id);
  if (solicitud) solicitud.estado = estado;
}

/** "acc-7k2", "ACC7K2" → "ACC7K2". */
const normalizar = (codigo: unknown) => (typeof codigo === 'string' ? codigo.toUpperCase().replace(/[^A-Z0-9]/g, '') : '');
const conGuion = (codigo: string) => `${codigo.slice(0, 3)}-${codigo.slice(3)}`;

export function crearRutasEmpresas({ responder, fallar, sesionEnEmpresa }: Herramientas) {
  /** Cuenta el intento; true si ya pasó el límite de la hora. */
  function superaLimite(persona: Persona) {
    const ahora = Date.now();
    const recientes = (intentos.get(persona.id) ?? []).filter((t) => ahora - t < HORA_MS);
    recientes.push(ahora);
    intentos.set(persona.id, recientes);
    return recientes.length > INTENTOS_POR_HORA;
  }

  /** Revisa el código y devuelve su invitación, o la respuesta de error. */
  function leerCodigo(cuerpo: Cuerpo, persona: Persona): Invitacion | RespuestaTransporte {
    if (superaLimite(persona)) {
      return fallar(429, 'DEMASIADOS_INTENTOS', 'Hiciste demasiados intentos. Espera una hora.');
    }
    const invitacion = INVITACIONES[normalizar(cuerpo.codigo)];
    if (!invitacion) return fallar(404, 'CODIGO_INVALIDO', 'El código no existe.');
    if (invitacion.vencida) return fallar(410, 'CODIGO_VENCIDO', 'El código venció o ya no tiene usos.');
    return invitacion;
  }
  const esError = (r: Invitacion | RespuestaTransporte): r is RespuestaTransporte => 'status' in r;

  const pendienteEn = (persona: Persona, empresaId: string) =>
    solicitudes.find((s) => s.usuarioId === persona.id && s.empresa.id === empresaId && s.estado === 'en_espera');

  return {
    'POST /invitations/preview': (cuerpo: Cuerpo, persona: Persona) => {
      const invitacion = leerCodigo(cuerpo, persona);
      if (esError(invitacion)) return invitacion;
      const { empresa, rol, requiereAprobacion } = invitacion;
      return responder(200, {
        empresa,
        rol,
        requiereAprobacion,
      } satisfies VistaPreviaCodigo);
    },

    'POST /invitations/redeem': (cuerpo: Cuerpo, persona: Persona) => {
      const invitacion = leerCodigo(cuerpo, persona);
      if (esError(invitacion)) return invitacion;
      if (pendienteEn(persona, invitacion.empresa.id)) {
        return fallar(409, 'SOLICITUD_EXISTENTE', 'Ya hay una solicitud pendiente para esa empresa.');
      }
      contador += 1;
      const solicitud = {
        id: `sol-${contador}`,
        usuarioId: persona.id,
        estado: invitacion.requiereAprobacion ? 'en_espera' : 'aprobada',
        empresa: invitacion.empresa,
        rol: invitacion.rol,
        codigo: conGuion(normalizar(cuerpo.codigo)),
        creadaEn: new Date().toISOString(),
      } as const;
      solicitudes.push(solicitud);
      const { usuarioId: _usuarioId, ...publica } = solicitud;
      return responder(201, { solicitud: publica });
    },

    'GET /join-requests/me': (_cuerpo: Cuerpo, persona: Persona) => {
      const propias = solicitudes.filter((s) => s.usuarioId === persona.id);
      // El "administrador" simulado de LEX-4P9 aprueba pasado su tiempo.
      for (const s of propias) {
        const espera = INVITACIONES[normalizar(s.codigo)]?.aprobarTrasMs;
        if (s.estado === 'en_espera' && espera !== undefined && Date.now() - Date.parse(s.creadaEn) >= espera) {
          s.estado = 'aprobada';
        }
      }
      return responder(200, { solicitudes: propias.map(({ usuarioId: _usuarioId, ...s }) => s) });
    },

    // Idempotente: cancelar una que ya no está pendiente no falla.
    'DELETE /join-requests/me/:id': (cuerpo: Cuerpo, persona: Persona) => {
      const solicitud = solicitudes.find((s) => s.id === cuerpo.id && s.usuarioId === persona.id);
      if (!solicitud) return fallar(404, 'NO_ENCONTRADO', 'No existe esa solicitud.');
      if (solicitud.estado === 'en_espera') solicitud.estado = 'cancelada';
      return responder(204);
    },

    'POST /tenants': (cuerpo: Cuerpo, persona: Persona) => {
      // Modo Personal (B35): una empresa de un solo miembro, idempotente.
      if (cuerpo.tipo === 'personal') {
        const existente = personales.get(persona.id);
        contador += 1;
        const id = existente ?? `esp-${contador}`;
        personales.set(persona.id, id);
        const empresa = { id, nombre: 'Espacio personal', verificada: false, tipo: 'personal' as const };
        return responder(existente ? 200 : 201, { ...sesionEnEmpresa(persona, id), empresa });
      }
      const razonSocial = typeof cuerpo.razonSocial === 'string' ? cuerpo.razonSocial.trim() : '';
      const ruc = typeof cuerpo.ruc === 'string' ? cuerpo.ruc : '';
      const campos: Record<string, string> = {};
      if (cuerpo.tipo !== 'empresa') campos.tipo = 'Debe ser "empresa" o "personal"';
      if (razonSocial.length < 3) campos.razonSocial = 'Ingresa la razón social';
      if (!/^\d{13}$/.test(ruc)) campos.ruc = 'El RUC tiene 13 dígitos';
      if (!TAMANOS_EQUIPO.includes(cuerpo.tamanoEquipo as never)) campos.tamanoEquipo = 'Elige el tamaño del equipo';
      if (Object.keys(campos).length > 0) return fallar(400, 'VALIDACION', 'Revisa los datos.', campos);
      if (rucs.has(ruc)) return fallar(409, 'RUC_EN_USO', 'Ya hay una empresa con ese RUC.');

      rucs.add(ruc);
      contador += 1;
      const empresa = {
        id: `emp-${contador}`,
        nombre: razonSocial,
        verificada: false,
        tipo: 'empresa' as const,
      };
      creadas.push({ usuarioId: persona.id, empresa });
      return responder(201, {
        ...sesionEnEmpresa(persona, empresa.id),
        empresa,
      });
    },
  };
}
