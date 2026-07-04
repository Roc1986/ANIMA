import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

function formatRUT(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${bodyFormatted}-${dv}`
}
import toast from 'react-hot-toast'
import { BuildingOfficeIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { api } from '../api/client'

interface CompanyData {
  id?: number
  name: string
  rut: string
  address: string
  city: string
  phone: string
  email: string
  logo_path?: string
  primary_color: string
  legal_rep_name?: string
  legal_rep_rut?: string
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_password?: string
  smtp_from_name?: string
}

const PRESET_COLORS = [
  '#1e3a5f', '#2563eb', '#0891b2', '#059669',
  '#7c3aed', '#be185d', '#dc2626', '#92400e',
]

export default function CompanySettings() {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState('#1e3a5f')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CompanyData>()

  const fetchCompany = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/company/')
      const data: CompanyData = res.data
      setCompany(data)
      reset(data)
      setSelectedColor(data.primary_color || '#1e3a5f')
      if (data.logo_path) {
        setLogoPreview(`/api/company/logo?t=${Date.now()}`)
      }
    } catch {
      toast.error('Error al cargar configuración de empresa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompany()
  }, [])

  const onSave = async (data: CompanyData) => {
    setSaving(true)
    try {
      await api.put('/api/company/', { ...data, primary_color: selectedColor })
      toast.success('Configuración guardada')
      fetchCompany()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/api/company/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Logo actualizado')
    } catch {
      toast.error('Error al subir logo')
      setLogoPreview(null)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24 text-gray-500">
        Cargando configuración...
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Empresa</h1>
        <p className="text-gray-500 text-sm mt-1">
          Datos que aparecerán en liquidaciones, cartas de amonestación y finiquitos
        </p>
      </div>

      {/* Logo section */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <PhotoIcon className="w-5 h-5 text-gray-500" />
          Logo de la empresa
        </h2>
        <div className="flex items-center gap-6">
          <div
            className="w-32 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-center text-gray-400">
                <PhotoIcon className="w-8 h-8 mx-auto mb-1" />
                <p className="text-xs">Subir logo</p>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">
              Formatos aceptados: PNG, JPG, GIF. Tamaño recomendado: 300×100 px.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary text-sm"
            >
              {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.gif"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>
        </div>
      </div>

      {/* Company data form */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BuildingOfficeIcon className="w-5 h-5 text-gray-500" />
          Datos de la empresa
        </h2>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label-field">Nombre de la empresa *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Empresa SpA"
                {...register('name', { required: true })}
              />
              {errors.name && <p className="error-text">Nombre requerido</p>}
            </div>

            <div>
              <label className="label-field">RUT empresa</label>
              <input
                type="text"
                className="input-field font-mono"
                placeholder="Ej: 76.123.456-7"
                {...register('rut')}
                onBlur={e => { const v = formatRUT(e.target.value); e.target.value = v; setValue('rut', v) }}
              />
            </div>

            <div>
              <label className="label-field">Ciudad / Comuna</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Santiago"
                {...register('city')}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label-field">Dirección</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Av. Providencia 1234, Piso 5"
                {...register('address')}
              />
            </div>

            <div>
              <label className="label-field">Teléfono</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: +56 2 2345 6789"
                {...register('phone')}
              />
            </div>

            <div>
              <label className="label-field">Correo electrónico</label>
              <input
                type="email"
                className="input-field"
                placeholder="contacto@empresa.cl"
                {...register('email')}
              />
            </div>

            {/* Legal representative */}
            <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Representante Legal (para finiquitos y contratos)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Nombre del representante legal</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Juan Pérez González"
                    {...register('legal_rep_name')}
                  />
                </div>
                <div>
                  <label className="label-field">RUT del representante legal</label>
                  <input
                    type="text"
                    className="input-field font-mono"
                    placeholder="Ej: 12.345.678-9"
                    {...register('legal_rep_rut')}
                    onBlur={e => { const v = formatRUT(e.target.value); e.target.value = v; setValue('legal_rep_rut', v) }}
                  />
                </div>
              </div>
            </div>

            {/* Color picker */}
            <div className="md:col-span-2">
              <label className="label-field">Color principal (encabezados de documentos)</label>
              <div className="flex items-center gap-3 mt-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === color ? '#111' : 'transparent',
                      transform: selectedColor === color ? 'scale(1.2)' : 'scale(1)',
                    }}
                    title={color}
                  />
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                    title="Color personalizado"
                  />
                  <span className="text-sm text-gray-500 font-mono">{selectedColor}</span>
                </div>
              </div>
              {/* Preview bar */}
              <div
                className="mt-3 h-3 rounded-full"
                style={{ backgroundColor: selectedColor }}
              />
            </div>
          </div>

          {/* SMTP configuration */}
          <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Correo de envío (liquidaciones)</p>
            <p className="text-xs text-gray-400 mb-3">
              Configura el correo con el que se enviarán las liquidaciones a los empleados. Ejemplo: Gmail, Zoho, Outlook.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Correo remitente (usuario SMTP)</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="Ej: rrhh@miempresa.cl"
                  {...register('smtp_user')}
                />
              </div>
              <div>
                <label className="label-field">Contraseña SMTP</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Contraseña o App Password"
                  {...register('smtp_password')}
                />
              </div>
              <div>
                <label className="label-field">Servidor SMTP</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: smtp.zoho.com / smtp.gmail.com"
                  {...register('smtp_host')}
                />
              </div>
              <div>
                <label className="label-field">Puerto SMTP</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="587"
                  {...register('smtp_port', { valueAsNumber: true })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label-field">Nombre del remitente</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: RRHH Ópticas Andina"
                  {...register('smtp_from_name')}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
