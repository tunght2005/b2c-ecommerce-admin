import http from '../utils/axios.http'
import type {
  BrandEntity,
  CategoryEntity,
  Product,
  ProductMutationPayload,
  ProductMutationResponse
} from '../types/product.type'

const PRODUCT_BASE_URL = 'products'

const productApi = {
  list() {
    return http.get<Product[]>(PRODUCT_BASE_URL)
  },

  search(q: string) {
    return http.get<Product[]>(`${PRODUCT_BASE_URL}/search`, {
      params: { q }
    })
  },

  detail(id: string) {
    return http.get<Product>(`${PRODUCT_BASE_URL}/${id}`)
  },

  create(payload: ProductMutationPayload) {
    return http.post<ProductMutationResponse>(PRODUCT_BASE_URL, payload)
  },

  update(id: string, payload: ProductMutationPayload) {
    return http.put<ProductMutationResponse>(`${PRODUCT_BASE_URL}/${id}`, payload)
  },

  remove(id: string) {
    return http.delete<{ message: string }>(`${PRODUCT_BASE_URL}/${id}`)
  },

  listBrands() {
    return http.get<BrandEntity[]>('brands')
  },

  listCategories() {
    return http.get<CategoryEntity[]>('categories')
  }
}

export default productApi
