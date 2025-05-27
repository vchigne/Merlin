# Sistema de Actualizaciones de Agentes - Merlin

## Descripción General

El sistema de actualizaciones de agentes de Merlin permite la gestión automática y manual de versiones de software de los agentes distribuidos. Este sistema garantiza que todos los agentes puedan mantenerse actualizados con las últimas versiones del software de manera controlada y con registro completo de logs.

## Componentes del Sistema

### 1. Gestión de Versiones (AgentVersion)

```typescript
interface AgentVersion {
  version: string;    // Número de versión (ej: "1.2.3")
  url: string;        // URL principal de descarga
  url2: string;       // URL secundaria (respaldo)
  url3: string;       // URL terciaria (respaldo adicional)
  created_at: string;
  updated_at: string;
}
```

**Características:**
- **Triple redundancia**: 3 URLs de descarga para mayor disponibilidad
- **Versionado semántico**: Control de versiones estructurado
- **Distribución robusta**: Failover automático entre URLs

### 2. Control de Actualización Automática

```typescript
interface AgentPassport {
  auto_clean_update: boolean;  // ¿Actualizar automáticamente?
  agent_version_id: string;    // Versión asignada al agente
  check_agent_update: boolean; // ¿Verificar actualizaciones?
  // ... otros campos
}
```

**Flujo de Actualización:**
1. **Verificación**: El agente consulta si hay versiones nuevas
2. **Validación**: Comprueba `auto_clean_update` y `check_agent_update`
3. **Descarga**: Intenta descargar desde URL principal, luego respaldos
4. **Instalación**: Aplica la actualización de manera controlada
5. **Registro**: Documenta todo el proceso en logs

### 3. Sistema de Logging (AgentUpdateLog)

```typescript
interface AgentUpdateLog {
  id: string;
  agent_passport_id: string;
  logs: string;                    // Información del proceso
  warnings: string;                // Advertencias durante actualización
  errors: string;                  // Errores encontrados
  checked_by_notificator: boolean; // ¿Ya revisado por notificador?
  created_at: string;
  updated_at: string;
}
```

**Tipos de Información Registrada:**
- **Logs**: Progreso normal del proceso de actualización
- **Warnings**: Situaciones que requieren atención pero no detienen el proceso
- **Errors**: Problemas que impiden completar la actualización
- **Notificaciones**: Control de alertas enviadas a administradores

## Operaciones Disponibles

### Consultas (Solo Lectura)

#### 1. Obtener Versiones de Agentes
```typescript
const agentsWithVersions = await hasuraService.getAgentVersions();
// Retorna: Array de agentes con su información de versión
```

#### 2. Consultar Logs de Actualización
```typescript
// Logs específicos de un agente
const agentLogs = await hasuraService.getAgentUpdateLogs(agentId, limit);

// Logs recientes del sistema
const recentLogs = await hasuraService.getRecentUpdateLogs();
```

### Mutaciones (Escritura Autorizada)

#### 1. Registrar Log de Actualización
```typescript
const logData = {
  agent_passport_id: agentId,
  logs: "Actualización iniciada correctamente",
  warnings: "Archivo temporal no eliminado",
  errors: ""
};

await hasuraService.insertAgentUpdateLog(agentId, logData);
```

#### 2. Configurar Actualización Automática
```typescript
// Habilitar/deshabilitar auto-actualización
await hasuraService.updateAgentAutoUpdate(agentId, true);
```

## GraphQL Queries y Mutations

### Consultas Principales

#### Obtener Agentes con Versiones
```graphql
query GetAgentVersions {
  merlin_agent_AgentPassport {
    id
    name
    auto_clean_update
    agent_version_id
    AgentVersion {
      version
      url
      url2
      url3
      created_at
      updated_at
    }
  }
}
```

#### Consultar Logs de Actualización
```graphql
query GetAgentUpdateLogs($agentId: uuid!, $limit: Int = 20) {
  merlin_agent_AgentUpdateLog(
    where: {agent_passport_id: {_eq: $agentId}}
    order_by: {created_at: desc}
    limit: $limit
  ) {
    id
    agent_passport_id
    logs
    warnings
    errors
    checked_by_notificator
    created_at
  }
}
```

### Mutaciones Autorizadas

#### Registrar Log de Actualización
```graphql
mutation InsertAgentUpdateLog($agentId: uuid!, $logData: merlin_agent_AgentUpdateLog_insert_input!) {
  insert_merlin_agent_AgentUpdateLog(objects: [$logData]) {
    affected_rows
  }
  update_merlin_agent_AgentPassport_by_pk(
    pk_columns: {id: $agentId}
    _set: {is_healthy: true}
  ) {
    affected_rows
  }
}
```

#### Configurar Auto-Actualización
```graphql
mutation UpdateAgentAutoUpdate($agentId: uuid!, $autoCleanUpdate: Boolean!) {
  update_merlin_agent_AgentPassport_by_pk(
    pk_columns: {id: $agentId}
    _set: {auto_clean_update: $autoCleanUpdate}
  ) {
    id
    name
    auto_clean_update
    updated_at
  }
}
```

## Casos de Uso

### 1. Monitoreo de Actualizaciones
- **Dashboard de versiones**: Visualizar qué versión ejecuta cada agente
- **Estado de actualización**: Ver agentes con auto-actualización habilitada
- **Historial de updates**: Revisar logs de actualizaciones pasadas

### 2. Diagnóstico de Problemas
- **Análisis de errores**: Investigar fallos en actualizaciones
- **Seguimiento de warnings**: Identificar problemas recurrentes
- **Auditoría de procesos**: Revisar el historial completo de cambios

### 3. Gestión Proactiva
- **Configuración remota**: Habilitar/deshabilitar auto-actualización
- **Distribución controlada**: Gestionar rollouts graduales
- **Monitoreo de salud**: Verificar estado post-actualización

## Integración con el Dashboard

### Componentes Sugeridos

1. **AgentVersionsTable**: Tabla con versiones actuales de cada agente
2. **UpdateLogsViewer**: Visor de logs de actualización con filtros
3. **UpdateConfigPanel**: Panel para configurar auto-actualización
4. **VersionDistributionChart**: Gráfico de distribución de versiones

### Métricas Importantes

- **Tasa de actualización exitosa**: % de actualizaciones sin errores
- **Tiempo de actualización promedio**: Duración típica del proceso
- **Distribución de versiones**: Qué versiones están en uso
- **Agentes desactualizados**: Identificar agentes con versiones antiguas

## Consideraciones de Seguridad

⚠️ **IMPORTANTE**: Este sistema permite operaciones de escritura limitadas:
- **Permitido**: Registrar logs de actualización y configurar auto-update
- **Restringido**: NO modificar versiones disponibles o URLs de descarga
- **Auditoría**: Todos los cambios quedan registrados con timestamps

## Códigos de Estado

- **Actualización exitosa**: `logs` con información, `errors` vacío
- **Actualización con warnings**: `logs` + `warnings` con detalles
- **Actualización fallida**: `errors` con descripción del problema
- **En progreso**: Log intermedio durante el proceso

Este sistema proporciona un control completo y auditable del proceso de actualización de agentes, garantizando la integridad y trazabilidad de todas las operaciones.