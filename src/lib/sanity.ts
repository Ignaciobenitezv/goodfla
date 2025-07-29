import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: 'kocon935', // tu projectId
  dataset: 'production',
  useCdn: true,
  apiVersion: '2023-01-01', // Podés cambiar la fecha si querés
})
