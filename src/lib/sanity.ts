// src/lib/sanity.ts
import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,   // ej: 5fl2mi29
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',

  // 🔒 Mientras depurás: NO uses CDN (evita respuestas cacheadas/vacías)
  useCdn: false,

  // ✅ Si tu dataset es privado, asegurate de tener SANITY_API_READ_TOKEN en .env.local
  token: process.env.SANITY_API_READ_TOKEN,

  // 🧭 Sólo documentos publicados (cambia a 'previewDrafts' si querés ver borradores)
  perspective: 'published',
})
