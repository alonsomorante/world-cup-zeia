'use client'

import { useState } from 'react'
import { loginAdmin } from '@/app/lib/actions'

export default function AdminLogin() {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError('')

    const result = await loginAdmin(formData)

    setPending(false)

    if ('error' in result) {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border-2 border-[#1a5f2a] p-8 w-full max-w-md shadow-[0_6px_0_rgba(0,0,0,0.08)]">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#1a5f2a] flex items-center justify-center text-white font-display text-3xl border-2 border-[#ffd700] mb-4">
            🔒
          </div>
          <h1 className="font-display text-3xl text-[#1a1a1a]">Acceso de administrador</h1>
          <p className="text-[#4a4539] mt-2">
            Ingresa la contraseña para registrar predicciones.
          </p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block font-display uppercase tracking-wide text-[#4a4539] mb-2">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full h-12 px-4 bg-[#f7f3e8] border-2 border-[#efe9d8] rounded-lg focus:border-[#1a5f2a] focus:outline-none text-[#1a1a1a]"
            />
          </div>

          {error && (
            <div className="p-3 bg-[#d93025]/10 border border-[#d93025]/30 text-[#d93025] rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full btn-primary h-12 text-lg disabled:opacity-60"
          >
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
