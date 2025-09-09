// src/lib/sanity.ts
import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,   // kocon935 (desde .env.local)
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,        // production
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  useCdn: !process.env.SANITY_API_READ_TOKEN,              // CDN si no hay token
  token: process.env.SANITY_API_READ_TOKEN,                // opcional (solo si tu dataset es privado)
})
