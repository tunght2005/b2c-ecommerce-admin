import http from '../utils/axios.http'
import type {
  Attribute,
  AttributeGroup,
  CreateOrUpdateAttributeGroupPayload,
  CreateOrUpdateAttributePayload,
  CreateOrUpdateBrandPayload,
  CreateOrUpdateCategoryPayload,
  CreateOrUpdateVariantPayload,
  ProductImage,
  ProductListForSelection,
  UploadProductImagesPayload,
  Variant
} from '../types/catalog.type'
import type { BrandEntity, CategoryEntity } from '../types/product.type'

const catalogApi = {
  listProducts() {
    return http.get<ProductListForSelection[]>('products')
  },

  // Categories
  listCategories() {
    return http.get<CategoryEntity[]>('categories')
  },

  createCategory(payload: CreateOrUpdateCategoryPayload) {
    return http.post<{ message: string; data: CategoryEntity }>('categories', payload)
  },

  updateCategory(id: string, payload: CreateOrUpdateCategoryPayload) {
    return http.put<{ message: string; data: CategoryEntity }>(`categories/${id}`, payload)
  },

  removeCategory(id: string) {
    return http.delete<{ message: string }>(`categories/${id}`)
  },

  // Brands
  listBrands() {
    return http.get<BrandEntity[]>('brands')
  },

  createBrand(payload: CreateOrUpdateBrandPayload) {
    const formData = new FormData()
    formData.append('name', payload.name)
    if (payload.logoFile) formData.append('logo', payload.logoFile)
    return http.post<{ message: string; data: BrandEntity }>('brands', formData)
  },

  updateBrand(id: string, payload: CreateOrUpdateBrandPayload) {
    const formData = new FormData()
    formData.append('name', payload.name)
    if (payload.logoFile) formData.append('logo', payload.logoFile)
    return http.put<{ message: string; data: BrandEntity }>(`brands/${id}`, formData)
  },

  removeBrand(id: string) {
    return http.delete<{ message: string }>(`brands/${id}`)
  },

  // Attribute groups
  listAttributeGroups() {
    return http.get<AttributeGroup[]>('attribute-groups')
  },

  createAttributeGroup(payload: CreateOrUpdateAttributeGroupPayload) {
    return http.post<AttributeGroup>('attribute-groups', payload)
  },

  updateAttributeGroup(id: string, payload: CreateOrUpdateAttributeGroupPayload) {
    return http.put<AttributeGroup>(`attribute-groups/${id}`, payload)
  },

  removeAttributeGroup(id: string) {
    return http.delete<{ message: string }>(`attribute-groups/${id}`)
  },

  // Attributes
  listAttributes() {
    return http.get<Attribute[]>('attributes')
  },

  listAttributesByGroup(groupId: string) {
    return http.get<Attribute[]>(`attributes/group/${groupId}`)
  },

  createAttribute(payload: CreateOrUpdateAttributePayload) {
    return http.post<{ message: string; data: Attribute }>('attributes', payload)
  },

  updateAttribute(id: string, payload: CreateOrUpdateAttributePayload) {
    return http.put<{ message: string; data: Attribute }>(`attributes/${id}`, payload)
  },

  removeAttribute(id: string) {
    return http.delete<{ message: string }>(`attributes/${id}`)
  },

  // Variants
  listVariantsByProduct(productId: string) {
    return http.get<Variant[]>(`variants/product/${productId}`)
  },

  createVariant(payload: CreateOrUpdateVariantPayload) {
    return http.post<{ message: string; data: Variant }>('variants', payload)
  },

  updateVariant(id: string, payload: Partial<CreateOrUpdateVariantPayload>) {
    return http.put<{ message: string; data: Variant }>(`variants/${id}`, payload)
  },

  removeVariant(id: string) {
    return http.delete<{ message: string }>(`variants/${id}`)
  },

  // Product images
  listProductImages(productId: string) {
    return http.get<ProductImage[]>(`product-images/product/${productId}`)
  },

  uploadProductImages(payload: UploadProductImagesPayload) {
    const formData = new FormData()
    formData.append('product_id', payload.product_id)
    payload.files.forEach((file) => formData.append('images', file))
    return http.post<{ message: string; data: ProductImage[] }>('product-images/upload', formData)
  },

  removeProductImage(id: string) {
    return http.delete<{ message: string }>(`product-images/${id}`)
  }
}

export default catalogApi
