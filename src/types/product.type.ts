export type ProductStatus = 'active' | 'inactive'

export interface ProductRefEntity {
  _id: string
  name: string
}

export interface CategoryEntity {
  _id: string
  name: string
  slug?: string
  parent_id?: string | null
  children?: CategoryEntity[]
}

export interface BrandEntity {
  _id: string
  name: string
  logo?: string | null
}

export interface Product {
  id: string
  _id?: string
  name: string
  slug?: string
  brand_id: string | ProductRefEntity | null
  category_id: string | ProductRefEntity | null
  description?: string
  specification?: Record<string, unknown> | null
  status: ProductStatus | string
  createdAt?: string
  updatedAt?: string
}

export interface ProductMutationPayload {
  name: string
  brand_id: string
  category_id: string
  description?: string
  specification?: Record<string, unknown>
  status?: ProductStatus
}

export interface ProductMutationResponse {
  message: string
  data: Product
}
