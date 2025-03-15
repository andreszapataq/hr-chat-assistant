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
import { FileDown, Calendar, Users, Filter, Search, Download } from 'lucide-react'

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

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-xl font-semibold text-primary">Generador de Reportes</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                <Calendar className="h-4 w-4 text-primary" />
                Mes
              </label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="rounded-lg border-gray-200 bg-white hover:bg-gray-50 transition-colors">
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
              <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                <Filter className="h-4 w-4 text-primary" />
                Tipo de solicitud
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-lg border-gray-200 bg-white hover:bg-gray-50 transition-colors">
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
              <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                <Users className="h-4 w-4 text-primary" />
                Empleado
              </label>
              <Select value={employee} onValueChange={setEmployee}>
                <SelectTrigger className="rounded-lg border-gray-200 bg-white hover:bg-gray-50 transition-colors">
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
          
          <div className="flex justify-end space-x-3">
            <Button 
              onClick={generateReport} 
              disabled={loading}
              className="rounded-lg bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Generar Reporte
            </Button>
            
            <Button 
              variant="outline" 
              onClick={exportToPDF} 
              disabled={reportData.length === 0 || loading}
              className="rounded-lg border-gray-200 text-primary hover:bg-primary/5 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar a PDF
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {reportData.length > 0 ? (
        <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">
              {getReportTitle()}
            </h2>
            <p className="text-gray-500 mt-1">
              {month !== 'all' 
                ? months.find(m => m.value === month)?.label 
                : 'Todos los meses'}
              {employee !== 'all' && ` - ${employee}`}
            </p>
          </div>
          
          <div className="overflow-hidden rounded-lg border border-gray-200 mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Empleado</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Duración</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((request, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border-b p-3 text-sm text-gray-700">{request.name}</td>
                    <td className="border-b p-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.type === 'sick leave' 
                          ? 'bg-[#00C49F]/10 text-[#00C49F]' 
                          : 'bg-[#0088FE]/10 text-[#0088FE]'
                      }`}>
                        {request.type === 'sick leave' ? 'Incapacidad' : 'Permiso'}
                      </span>
                    </td>
                    <td className="border-b p-3 text-sm text-gray-700">{formatDate(request.date)}</td>
                    <td className="border-b p-3 text-sm text-gray-700">{request.duration}</td>
                    <td className="border-b p-3 text-sm text-gray-700">{request.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Resumen por Empleado</h3>
            {Object.entries(groupedData).map(([name, requests]) => (
              <div key={name} className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">{name}</h4>
                <ul className="space-y-2 pl-5">
                  {requests.map((req, idx) => (
                    <li key={idx} className="text-sm text-gray-700">
                      <span className={`inline-flex items-center mr-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        req.type === 'sick leave' 
                          ? 'bg-[#00C49F]/10 text-[#00C49F]' 
                          : 'bg-[#0088FE]/10 text-[#0088FE]'
                      }`}>
                        {req.type === 'sick leave' ? 'Incapacidad' : 'Permiso'}
                      </span>
                      <span>({req.duration}) el {formatDate(req.date)}: {req.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="mt-8 text-sm text-gray-500 text-right border-t pt-4">
            <p>Total de solicitudes: <span className="font-medium text-gray-700">{reportData.length}</span></p>
            <p>Reporte generado: <span className="font-medium text-gray-700">{new Date().toLocaleDateString()}</span></p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FileDown className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-gray-700">No hay datos para mostrar</p>
            <p className="max-w-md text-sm text-gray-500">
              Selecciona los filtros y haz clic en &quot;Generar Reporte&quot; para ver los resultados.
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 