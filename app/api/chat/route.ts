import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const response = await anthropicClient.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      messages,
      system: `Eres un asistente de RRHH amigable y servicial. Sigue estas reglas estrictamente:

      1. Responde de manera natural y conversacional a las preguntas del usuario.
      
      2. SOLO si el usuario está haciendo una solicitud formal (permiso, incapacidad, etc.), incluye un JSON en el siguiente formato, separado por una línea en blanco:

      {
        "name": "Nombre del empleado",
        "type": "Tipo de solicitud (leave, sick leave, late arrival)",
        "duration": "Duración de la solicitud",
        "reason": "Razón de la solicitud",
        "date": "Fecha de la solicitud (formato YYYY-MM-DD)"
      }

      3. Para clasificar como "sick leave" (incapacidad), debe ser una condición médica que impida trabajar, incluyendo:
         - Enfermedades gastrointestinales (daño de estómago, gastritis, etc.)
         - Enfermedades respiratorias
         - Lesiones físicas
         - Condiciones crónicas

      4. Si es una conversación general o pregunta informativa, NO incluyas el JSON.

      5. Cuando el usuario solicite consultar información histórica, incluye un JSON con el siguiente formato:

      {
        "action": "query",
        "filters": {
          "startDate": "YYYY-MM-DD",
          "endDate": "YYYY-MM-DD",
          "name": "nombre del empleado",
          "type": "tipo de solicitud"
        }
      }`,
      max_tokens: 1024,
    });

    if (!response.content || response.content.length === 0) {
      throw new Error('Empty response from Anthropic API');
    }

    const content = response.content[0];
    if (content.type === 'text') {
      return new Response(JSON.stringify({ content: content.text }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Error processing chat request', { status: 500 });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response('Error processing chat request', { status: 500 });
  }
}
