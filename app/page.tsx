'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface HRRequest {
  name: string;
  type: string;
  duration: string;
  reason: string;
  date: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    leaveRequests: 0,
    sickLeave: 0,
  })

  useEffect(() => {
    fetchStatistics()
  }, [])

  async function fetchStatistics(month?: string, type?: string) {
    let query = supabase
      .from('hr_requests')
      .select('type, date');

    if (month) {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (data) {
      setStatistics({
        totalRequests: data.length,
        leaveRequests: data.filter(r => r.type === 'leave').length,
        sickLeave: data.filter(r => r.type === 'sick leave').length,
      });
    } else if (error) {
      console.error('Error fetching statistics:', error);
    }
  }

  async function saveRequest(request: HRRequest) {
    const { error } = await supabase
      .from('hr_requests')
      .insert([request])
    
    if (error) {
      console.error('Error saving request:', error);
      return false;
    }
    return true;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content;
      
      // Buscar el JSON en la respuesta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      // Separar el texto conversacional del JSON
      const conversationalText = content.replace(jsonMatch?.[0] || '', '').trim();
      
      // Agregar solo la respuesta conversacional
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: conversationalText 
      }]);

      // Procesar el JSON si existe
      if (jsonMatch) {
        try {
          const parsedData = JSON.parse(jsonMatch[0]);
          // Verificar que sea una solicitud válida
          if (parsedData.type && parsedData.type !== 'N/A') {
            const isRequest = await saveRequest(parsedData);
            if (isRequest) {
              fetchStatistics();
            }
          }
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo.' 
      }]);
    }
  }

  // Ejemplo de cómo llamar la función para febrero
  useEffect(() => {
    fetchStatistics('2024-02', 'sick leave');
  }, []);

  useEffect(() => {
    // Verificar la conexión a Supabase y los datos
    async function checkData() {
      const { data, error } = await supabase
        .from('hr_requests')
        .select('*')
        .eq('type', 'sick leave')
        .gte('date', '2024-02-01')
        .lte('date', '2024-02-29');

      if (error) {
        console.error('Error de conexión:', error);
        return;
      }

      if (data.length === 0) {
        console.log('No se encontraron datos para febrero');
        return;
      }

      console.log('Datos encontrados:', data);
    }

    checkData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="flex h-16 items-center px-4 container mx-auto">
          <h1 className="text-xl font-semibold">Asistente de RRHH</h1>
          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Bienvenido, andreszapataq
            </span>
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto py-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-4">
          {/* Chat Area */}
          <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex-1 overflow-y-auto mb-4 p-4 rounded-lg border">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <span
                    className={`inline-block p-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.content}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje"
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M.5 1.163A1 1 0 0 1 1.97.28l12.868 6.837a1 1 0 0 1 0 1.766L1.969 15.72A1 1 0 0 1 .5 14.836V10.33a1 1 0 0 1 .816-.983L8.5 8 1.316 6.653A1 1 0 0 1 .5 5.67V1.163Z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de Ausencias</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Solicitudes totales: {statistics.totalRequests}</p>
                <p>Permisos: {statistics.leaveRequests}</p>
                <p>Incapacidades: {statistics.sickLeave}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sistema de análisis en modo básico - reportes detallados no disponibles.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
