import type { Product } from './product.type'

export interface AttributeGroup {
  _id: string
  name: string
}

export interface Attribute {
  _id: string
  name: string
  group_id:
    | string
    | {
        _id: string
        name: string
      }
}

export interface Variant {
  _id: string
  product_id:
    | string
    | {
        _id: string
        name?: string
      }
  sku: string
  price?: number
  old_price?: number
  stock?: number
  attributes: Array<
    | string
    | {
        _id: string
        name?: string
      }
  >
  createdAt?: string
  updatedAt?: string
}

export interface ProductImage {
  _id: string
  product_id: string
  url: string
  is_primary?: boolean
  sort_order?: number
  createdAt?: string
}

export interface CreateOrUpdateCategoryPayload {
  name: string
  parent_id?: string | null
}

export interface CreateOrUpdateBrandPayload {
  name: string
  logoFile?: File | null
}

export interface CreateOrUpdateAttributeGroupPayload {
  name: string
}

export interface CreateOrUpdateAttributePayload {
  name: string
  group_id: string
}

export interface CreateOrUpdateVariantPayload {
  product_id: string
  sku: string
  price?: number
  old_price?: number
  stock?: number
  attributes?: string[]
}

export interface UploadProductImagesPayload {
  product_id: string
  files: File[]
}

export type ProductListForSelection = Pick<Product, 'id' | '_id' | 'name'>
