'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from '@/lib/supabase'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { FileDown } from 'lucide-react'

interface HRRequest {
  name: string;
  type: string;
  duration: string;
  reason: string;
  date: string;
}

export default function ReportGenerator() {
  const [month, setMonth] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [employee, setEmployee] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<HRRequest[]>([])
  const [employees, setEmployees] = useState<{value: string, label: string}[]>([
    { value: 'all', label: 'Todos los empleados' }
  ])
  const reportRef = useRef<HTMLDivElement>(null)

  // Cargar la lista de empleados al iniciar
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const { data, error } = await supabase
          .from('hr_requests')
          .select('name')
          .order('name');
        
        if (error) throw error;
        
        if (data) {
          // Filtrar nombres únicos
          const uniqueNames = Array.from(new Set(data.map(item => item.name)));
          
          const employeeOptions = uniqueNames.map((name: string) => ({
            value: name,
            label: name
          }));
          
          setEmployees([
            { value: 'all', label: 'Todos los empleados' },
            ...employeeOptions
          ]);
        }
      } catch (error) {
        console.error('Error al cargar empleados:', error);
      }
    }
    
    fetchEmployees();
  }, []);

  const months = [
    { value: 'all', label: 'Todos los meses' },
    { value: '2025-01', label: 'Enero 2025' },
    { value: '2025-02', label: 'Febrero 2025' },
    { value: '2025-03', label: 'Marzo 2025' },
    { value: '2025-04', label: 'Abril 2025' },
    { value: '2025-05', label: 'Mayo 2025' },
    { value: '2025-06', label: 'Junio 2025' },
    { value: '2025-07', label: 'Julio 2025' },
    { value: '2025-08', label: 'Agosto 2025' },
    { value: '2025-09', label: 'Septiembre 2025' },
    { value: '2025-10', label: 'Octubre 2025' },
    { value: '2025-11', label: 'Noviembre 2025' },
    { value: '2025-12', label: 'Diciembre 2025' },
  ]

  const requestTypes = [
    { value: 'all', label: 'Todos' },
    { value: 'leave', label: 'Permisos' },
    { value: 'sick leave', label: 'Incapacidades' },
  ]

  async function generateReport() {
    if (month === 'all' && employee === 'all' && type === 'all') {
      // Mostrar alerta si no hay filtros seleccionados
      alert('Por favor selecciona al menos un filtro (mes, tipo o empleado)');
      return;
    }
    
    setLoading(true);
    
    try {
      let query = supabase
        .from('hr_requests')
        .select('*');
      
      // Filtrar por mes si está seleccionado
      if (month !== 'all') {
        const startDate = `${month}-01`;
        const endDate = `${month}-31`;
        query = query
          .gte('date', startDate)
          .lte('date', endDate);
      }
      
      // Filtrar por tipo si está seleccionado
      if (type !== 'all') {
        query = query.eq('type', type);
      }
      
      // Filtrar por empleado si está seleccionado
      if (employee !== 'all') {
        query = query.eq('name', employee);
      }
      
      // Ordenar por fecha descendente
      query = query.order('date', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setReportData(data || []);
    } catch (error) {
      console.error('Error al generar el reporte:', error);
    } finally {
      setLoading(false);
    }
  }

  const exportToPDF = async () => {
    if (!reportRef.current || reportData.length === 0) return
    
    setLoading(true)
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      
      // Obtener el nombre del mes para el nombre del archivo
      const selectedMonth = month !== 'all' 
        ? months.find(m => m.value === month)?.label 
        : 'Todos_los_meses';
      
      const reportType = type !== 'all' 
        ? (type === 'leave' ? 'Permisos' : 'Incapacidades') 
        : 'Solicitudes';
      
      // Incluir el nombre del empleado en el nombre del archivo si está filtrado
      const employeeName = employee !== 'all' ? `_${employee}` : '';
      
      pdf.save(`Reporte_${reportType}${employeeName}_${selectedMonth}.pdf`)
    } catch (error) {
      console.error('Error al exportar a PDF:', error)
    } finally {
      setLoading(false)
    }
  }

  // Agrupar datos por empleado
  const groupedData = reportData.reduce((acc: Record<string, HRRequest[]>, item) => {
    acc[item.name] = acc[item.name] || []
    acc[item.name].push(item)
    return acc
  }, {})

  // Obtener el título del reporte
  const getReportTitle = () => {
    const typeText = type !== 'all' 
      ? (type === 'leave' ? 'Permisos' : 'Incapacidades') 
      : 'Solicitudes';
    
    return `Reporte de ${typeText}`;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generador de Reportes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un mes" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de solicitud</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  {requestTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Empleado</label>
              <Select value={employee} onValueChange={setEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los empleados" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.value} value={emp.value}>
                      {emp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              onClick={generateReport} 
              disabled={loading}
            >
              Generar Reporte
            </Button>
            
            <Button 
              variant="outline" 
              onClick={exportToPDF} 
              disabled={reportData.length === 0 || loading}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Exportar a PDF
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {reportData.length > 0 && (
        <div ref={reportRef} className="bg-white p-6 rounded-lg border">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">
              {getReportTitle()}
            </h2>
            <p className="text-muted-foreground">
              {month !== 'all' 
                ? months.find(m => m.value === month)?.label 
                : 'Todos los meses'}
              {employee !== 'all' && ` - ${employee}`}
            </p>
          </div>
          
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left">Empleado</th>
                <th className="border p-2 text-left">Tipo</th>
                <th className="border p-2 text-left">Fecha</th>
                <th className="border p-2 text-left">Duración</th>
                <th className="border p-2 text-left">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((request, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                  <td className="border p-2">{request.name}</td>
                  <td className="border p-2">
                    {request.type === 'sick leave' ? 'Incapacidad' : 'Permiso'}
                  </td>
                  <td className="border p-2">{request.date}</td>
                  <td className="border p-2">{request.duration}</td>
                  <td className="border p-2">{request.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Resumen por Empleado</h3>
            {Object.entries(groupedData).map(([name, requests]) => (
              <div key={name} className="mb-4">
                <h4 className="font-medium">{name}</h4>
                <ul className="list-disc pl-5">
                  {requests.map((req, idx) => (
                    <li key={idx}>
                      {req.type === 'sick leave' ? 'Incapacidad' : 'Permiso'} ({req.duration}) 
                      el {req.date}: {req.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-sm text-muted-foreground text-right">
            <p>Total de solicitudes: {reportData.length}</p>
            <p>Reporte generado: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  )
} 