import createImageUrlBuilder from '@sanity/image-url'
import { sanityClient } from './sanity.client'

const builder = createImageUrlBuilder(sanityClient)
export const urlFor = (src: any) => builder.image(src)
