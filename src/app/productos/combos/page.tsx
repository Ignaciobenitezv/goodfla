import { sanityClient } from "@/lib/sanity.client"
import { Q_COMBOS } from "@/lib/sanityQueries"
import CombosClient from "./CombosClient"

export const revalidate = 60

export default async function CombosPage() {
  const combos = await sanityClient.fetch(Q_COMBOS)
  return <CombosClient combos={combos} />
}
