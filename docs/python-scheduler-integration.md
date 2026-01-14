# Python Scheduler Integration

Este documento describe cómo integrar el sistema de schedules del dashboard con el scheduler Python de Merlin.

## Arquitectura

El sistema de schedules está diseñado para funcionar de dos maneras:

1. **Dashboard (actual)**: Gestión visual de schedules y visualización de cola
2. **Python Scheduler (producción)**: Ejecución real de los crons

## Configuración del Scheduler Python

### Opción 1: Consultar la API del Dashboard

```python
# scheduler_from_dashboard.py
import requests
from datetime import datetime
from loguru import logger

DASHBOARD_API = "https://your-dashboard-url.replit.app/api"

def get_schedules_for_time(time_of_day: str):
    """Obtiene los schedules configurados para una hora específica"""
    response = requests.get(f"{DASHBOARD_API}/schedules")
    schedules = response.json()
    
    return [s for s in schedules if s['timeOfDay'] == time_of_day and s['enabled']]

def should_run_today(schedule: dict) -> bool:
    """Verifica si un schedule debe ejecutarse hoy"""
    today = datetime.now()
    
    if schedule['frequencyType'] == 'daily':
        return True
    
    if schedule['frequencyType'] == 'weekly':
        days = [int(d) for d in schedule['daysOfWeek'].split(',')]
        # Python: 0=Monday, 6=Sunday
        return today.weekday() in days
    
    if schedule['frequencyType'] == 'monthly':
        days = [int(d) for d in schedule['daysOfMonth'].split(',')]
        return today.day in days
    
    return False

def get_pipelines_to_run(time_of_day: str) -> list:
    """Obtiene los pipeline IDs que deben ejecutarse en un horario"""
    schedules = get_schedules_for_time(time_of_day)
    pipeline_ids = []
    
    for schedule in schedules:
        if should_run_today(schedule):
            for target in schedule.get('targets', []):
                if target.get('enabled', True):
                    pipeline_ids.append(target['pipelineId'])
    
    return pipeline_ids

# Ejemplo de uso en el scheduler principal:
# 
# def cron_job():
#     current_time = datetime.now().strftime("%H:%M")
#     pipelines = get_pipelines_to_run(current_time)
#     if pipelines:
#         add_ppls_to_cron(ppl_ids=pipelines)
```

### Opción 2: Consultar Hasura Directamente

Si prefieres consultar la base de datos directamente sin pasar por el dashboard:

```python
# scheduler_from_hasura.py
# NOTA: Los schedules actualmente están en memoria del dashboard.
# Para esta opción, necesitarías migrar los schedules a Hasura primero.

from api.engine.hasura import Hasura
from datetime import datetime
from loguru import logger

hasura = Hasura()

QUERY_SCHEDULES = """
query GetActiveSchedules($time: String!) {
    schedule_configs(where: {time_of_day: {_eq: $time}, enabled: {_eq: true}}) {
        id
        label
        frequency_type
        days_of_week
        days_of_month
        targets {
            pipeline_id
            enabled
        }
    }
}
"""

def get_pipelines_for_time(time_of_day: str) -> list:
    result = hasura.makeRequest({
        "query": QUERY_SCHEDULES,
        "variables": {"time": time_of_day}
    })
    
    # ... procesar resultado similar a Opción 1
```

## Integración con el Scheduler Existente

Para migrar gradualmente del archivo `scheduler.py` actual al sistema basado en dashboard:

```python
# scheduler_hybrid.py
"""
Scheduler híbrido que combina el sistema legacy con el dashboard.
Descomentar las líneas cuando estés listo para producción.
"""

import schedule
from datetime import datetime
from loguru import logger

# === IMPORTAR FUNCIONES DEL DASHBOARD ===
# from scheduler_from_dashboard import get_pipelines_to_run

# === FUNCIÓN LEGACY (actual) ===
from scheduler import (
    cron_00_00_am_PE,
    cron_00_15_am_PE,
    # ... etc
)

# === NUEVA FUNCIÓN BASADA EN DASHBOARD ===
# def cron_from_dashboard():
#     current_time = datetime.now().strftime("%H:%M")
#     pipelines = get_pipelines_to_run(current_time)
#     if pipelines:
#         logger.info(f"Ejecutando {len(pipelines)} pipelines desde dashboard para {current_time}")
#         add_ppls_to_cron(ppl_ids=pipelines)

# === CONFIGURACIÓN DE SCHEDULE ===

# Opción A: Usar sistema legacy
schedule.every().day.at("00:00").do(cron_00_00_am_PE)
schedule.every().day.at("00:15").do(cron_00_15_am_PE)
# ... etc

# Opción B: Usar sistema del dashboard (descomentar cuando esté listo)
# for hour in range(24):
#     for minute in [0, 15, 30, 45]:
#         time_str = f"{hour:02d}:{minute:02d}"
#         schedule.every().day.at(time_str).do(cron_from_dashboard)

# === LOOP PRINCIPAL ===
if __name__ == "__main__":
    logger.info("Iniciando scheduler...")
    while True:
        schedule.run_pending()
        time.sleep(60)
```

## Notas de Migración

1. **Fase 1 (actual)**: Usa el dashboard para visualizar y gestionar schedules
2. **Fase 2**: Importa tu `scheduler.py` actual al dashboard usando el botón "Importar"
3. **Fase 3**: Configura el scheduler Python para leer del dashboard
4. **Fase 4**: Desactiva las funciones hardcodeadas del `scheduler.py` original

## Variables de Entorno

```env
# Para el scheduler Python
DASHBOARD_API_URL=https://your-dashboard.replit.app/api
HASURA_GRAPHQL_URL=https://your-hasura-instance/v1/graphql
HASURA_ADMIN_SECRET=your-secret
```
