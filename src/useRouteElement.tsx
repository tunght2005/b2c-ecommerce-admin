import { Navigate, Outlet, useRoutes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import path from './constants/path'
import { useAuth } from './contexts/app.context'
import NotFound from './pages/NotFound/NotFound'
import Dashboard from './pages/Dashboard/Dashboard'
import Login from './pages/Login/Login'
import MyProfile from './pages/MyProfile'
import AllUsers from './pages/AdminUsers'
import ProductsPage from './pages/AdminProducts'
import CategoriesPage from './pages/AdminCategories'
import BrandsPage from './pages/AdminBrands'
import AttributesVariantsPage from './pages/AdminAttributesVariants'
import ProductImagesPage from './pages/AdminProductImages'
import OrdersPage from './pages/AdminOrders'
import OrderItemsPage from './pages/AdminOrderItems'
import ShipmentsPage from './pages/AdminShipments'
import ShipperAssignPage from './pages/AdminShipperAssign'
import TrackingLogsPage from './pages/AdminTrackingLogs'
import DeliveryStaffPage from './pages/AdminDeliveryStaff'

//Tạo Protect để bảo vệ web khi user biêt domain mà chưa đăng nhập thì những cái như profile, apply k cho phép truy cập
function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to={path.login} replace />
}
// // Chặn User vào lại trang login khi đã login rồi sẽ Navigate lại trang chủ
function RejectedRoute() {
  const { isAuthenticated } = useAuth()
  return !isAuthenticated ? <Outlet /> : <Navigate to={path.dashboard} replace />
}

export default function useRouteElement() {
  const routeElements = useRoutes([
    {
      path: '',
      element: <ProtectedRoute />,
      children: [
        {
          path: path.dashboard,
          element: (
            <MainLayout>
              <Dashboard />
            </MainLayout>
          )
        },
        {
          path: path.adminUsers,
          element: (
            <MainLayout>
              <AllUsers />
            </MainLayout>
          )
        },
        {
          path: path.adminProducts,
          element: (
            <MainLayout>
              <ProductsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminCategories,
          element: (
            <MainLayout>
              <CategoriesPage />
            </MainLayout>
          )
        },
        {
          path: path.adminBrands,
          element: (
            <MainLayout>
              <BrandsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminAttributesVariants,
          element: (
            <MainLayout>
              <AttributesVariantsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminProductImages,
          element: (
            <MainLayout>
              <ProductImagesPage />
            </MainLayout>
          )
        },
        {
          path: path.adminOrders,
          element: (
            <MainLayout>
              <OrdersPage />
            </MainLayout>
          )
        },
        {
          path: path.adminOrderItems,
          element: (
            <MainLayout>
              <OrderItemsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminShipments,
          element: (
            <MainLayout>
              <ShipmentsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminShipperAssign,
          element: (
            <MainLayout>
              <ShipperAssignPage />
            </MainLayout>
          )
        },
        {
          path: path.adminTrackingLogs,
          element: (
            <MainLayout>
              <TrackingLogsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminDeliveryStaff,
          element: (
            <MainLayout>
              <DeliveryStaffPage />
            </MainLayout>
          )
        },
        {
          path: path.myProfile,
          element: (
            <MainLayout>
              <MyProfile />
            </MainLayout>
          )
        }
      ]
    },
    {
      path: '',
      element: <RejectedRoute />,
      children: [
        {
          path: path.login,
          index: true,
          element: <Login />
        }
      ]
    },
    {
      path: '*',
      element: (
        <MainLayout>
          <NotFound />
        </MainLayout>
      )
    }
  ])
  return routeElements
}
