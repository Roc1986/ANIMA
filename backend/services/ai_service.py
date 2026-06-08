"""
AI Legal Service using Claude API.
Analyzes Chilean labor law changes and proposes parameter updates.
"""

import anthropic
from typing import Optional
from config import settings


SYSTEM_PROMPT = """Eres un experto en derecho laboral chileno y previsional.
Tu especialidad es el análisis de cambios en la legislación laboral chilena, incluyendo:
- Código del Trabajo de Chile
- Ley de AFP (DL 3500)
- Ley de Cesantía (Ley 19.728)
- Ley 21.561 (reducción jornada laboral)
- Instrucciones del SII para IUSC (Art. 43 N°1 LIR)
- Normativas de la Superintendencia de Pensiones
- Normativas de la SUSESO

Cuando analices cambios legales:
1. Identifica qué parámetros del sistema se verían afectados
2. Proporciona el nuevo valor exacto con su fuente legal
3. Explica el impacto en los cálculos de nómina
4. Indica la fecha de vigencia del cambio
5. Proporciona recomendaciones prácticas

Los parámetros que maneja el sistema son:
- IMM: Ingreso Mínimo Mensual en CLP
- UF: Unidad de Fomento en CLP
- UTM: Unidad Tributaria Mensual en CLP
- TOPE_IMPONIBLE_AFP_UF: Tope imponible AFP en UF (actualmente 81.6 UF)
- TOPE_IMPONIBLE_SALUD_UF: Tope imponible salud en UF (actualmente 81.6 UF)
- AFP_HABITAT, AFP_PROVIDA, AFP_CAPITAL, AFP_CUPRUM, AFP_PLANVITAL, AFP_MODEL, AFP_UNO: Tasas AFP en %
- TASA_SALUD: Tasa cotización salud (actualmente 7%)
- CESANTIA_TRABAJADOR: Tasa cesantía trabajador (0.6%)
- CESANTIA_EMPLEADOR_INDEFINIDO: Tasa cesantía empleador contrato indefinido (2.4%)
- CESANTIA_EMPLEADOR_PLAZO_FIJO: Tasa cesantía empleador contrato plazo fijo (3.0%)
- SIS_EMPLEADOR: Tasa SIS empleador (1.49%)
- GRATIFICACION_TOPE_IMM_MULTIPLICADOR: Multiplicador IMM para tope gratificación (4.75)
- GRATIFICACION_PORCENTAJE: Porcentaje gratificación legal mensual (25%)
- JORNADA_ORDINARIA_SEMANAL: Horas semanales (actualmente 40, reducción a 37 en 2026)

Responde siempre en español y con precisión técnica.
"""


class AILegalService:
    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def analyze_legal_changes(self, query: str, current_params: dict) -> dict:
        """
        Use Claude to analyze Chilean labor law changes.
        Returns analysis and proposed parameter updates.
        """
        if not self.client:
            return {
                "error": "ANTHROPIC_API_KEY no configurada",
                "analysis": "Por favor configure la variable ANTHROPIC_API_KEY para usar el asistente de IA.",
                "proposed_changes": [],
            }

        # Build context with current parameters
        params_text = "\n".join([f"- {k}: {v}" for k, v in current_params.items()])

        user_message = f"""Analiza el siguiente cambio o consulta sobre legislación laboral chilena:

CONSULTA: {query}

PARÁMETROS ACTUALES DEL SISTEMA:
{params_text}

Por favor:
1. Analiza el cambio o consulta
2. Identifica qué parámetros deben actualizarse
3. Proporciona los nuevos valores con justificación legal
4. Indica si los cambios son urgentes o pueden esperar
5. Estructura tu respuesta en formato JSON con los siguientes campos:
   - "analysis": string con el análisis detallado
   - "proposed_changes": lista de objetos con {{key, current_value, new_value, reason, source, urgency: "alta|media|baja"}}
   - "recommendations": lista de recomendaciones adicionales
   - "legal_references": lista de referencias legales relevantes

Responde ÚNICAMENTE con el JSON, sin markdown adicional.
"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": user_message}
                ],
            )

            response_text = message.content[0].text

            # Try to parse JSON - strip markdown code fences if present
            import json, re
            clean = response_text.strip()
            md_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', clean)
            if md_match:
                clean = md_match.group(1).strip()
            try:
                result = json.loads(clean)
            except json.JSONDecodeError:
                result = {
                    "analysis": response_text,
                    "proposed_changes": [],
                    "recommendations": [],
                    "legal_references": [],
                }

            return result

        except Exception as e:
            return {
                "error": str(e),
                "analysis": f"Error al conectar con el servicio de IA: {str(e)}",
                "proposed_changes": [],
            }

    async def explain_calculation(self, payroll_data: dict) -> str:
        """Explain a payroll calculation in plain Spanish."""
        if not self.client:
            return "ANTHROPIC_API_KEY no configurada."

        user_message = f"""Explica la siguiente liquidación de sueldo chilena de forma clara para el trabajador:

{payroll_data}

Explica cada concepto, por qué se descuenta, y si los cálculos son correctos según la ley vigente.
Responde en español de forma clara y sencilla, máximo 500 palabras.
"""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            return message.content[0].text
        except Exception as e:
            return f"Error: {str(e)}"

    async def get_legal_update_summary(self) -> dict:
        """Get a summary of recent Chilean labor law updates."""
        if not self.client:
            return {"error": "ANTHROPIC_API_KEY no configurada"}

        user_message = """Proporciona un resumen de los principales cambios en la legislación laboral chilena
        relevantes para el cálculo de nóminas en 2024-2025.

        Incluye:
        1. Cambios en el IMM
        2. Cambios en tasas AFP
        3. Implementación Ley 21.561 (reducción jornada)
        4. Cambios en IUSC
        5. Otros cambios relevantes

        Responde en formato JSON con estructura:
        {
          "last_updated": "fecha aproximada del conocimiento",
          "key_changes": [{"area": string, "change": string, "effective_date": string, "impact": string}],
          "upcoming_changes": [{"area": string, "change": string, "effective_date": string}]
        }
        """

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            import json
            try:
                return json.loads(message.content[0].text)
            except Exception:
                return {"summary": message.content[0].text}
        except Exception as e:
            return {"error": str(e)}
