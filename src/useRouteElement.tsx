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
import FeedbackTicketsPage from './pages/AdminFeedbackTickets'
import FeedbackRepliesPage from './pages/AdminFeedbackReplies'
import FeedbackRatingsPage from './pages/AdminFeedbackRatings'
import ReturnsPage from './pages/AdminReturns'
import ReturnPoliciesPage from './pages/AdminReturnPolicies'
import WarrantyPage from './pages/AdminWarranty'
import AiConversationsPage from './pages/AdminAiConversations'
import AiFeedbackAnalysisPage from './pages/AdminAiFeedbackAnalysis'
import PromotionsPage from './pages/AdminPromotions'
import ProductPromotionsPage from './pages/AdminProductPromotions'
import VouchersPage from './pages/AdminVouchers'
import VoucherUsagesPage from './pages/AdminVoucherUsages'
import StaffPage from './pages/AdminStaff'
import ReviewsPage from './pages/AdminReviews'
import MarketingPage from './pages/AdminMarketing'
import BannersPage from './pages/AdminBanners'
import NotificationsPage from './pages/AdminNotifications'
import AnalyticsPage from './pages/AdminAnalytics'
import DashboardStatsPage from './pages/AdminDashboardStats'
import RevenuePage from './pages/AdminRevenue'
import OrdersReportPage from './pages/AdminOrdersReport'

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
          path: path.adminFeedbackTickets,
          element: (
            <MainLayout>
              <FeedbackTicketsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminFeedbackReplies,
          element: (
            <MainLayout>
              <FeedbackRepliesPage />
            </MainLayout>
          )
        },
        {
          path: path.adminFeedbackRatings,
          element: (
            <MainLayout>
              <FeedbackRatingsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminReturns,
          element: (
            <MainLayout>
              <ReturnsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminReturnPolicies,
          element: (
            <MainLayout>
              <ReturnPoliciesPage />
            </MainLayout>
          )
        },
        {
          path: path.adminWarranty,
          element: (
            <MainLayout>
              <WarrantyPage />
            </MainLayout>
          )
        },
        {
          path: path.adminAiConversations,
          element: (
            <MainLayout>
              <AiConversationsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminAiFeedbackAnalysis,
          element: (
            <MainLayout>
              <AiFeedbackAnalysisPage />
            </MainLayout>
          )
        },
        {
          path: path.adminPromotions,
          element: (
            <MainLayout>
              <PromotionsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminProductPromotions,
          element: (
            <MainLayout>
              <ProductPromotionsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminVouchers,
          element: (
            <MainLayout>
              <VouchersPage />
            </MainLayout>
          )
        },
        {
          path: path.adminVoucherUsages,
          element: (
            <MainLayout>
              <VoucherUsagesPage />
            </MainLayout>
          )
        },
        {
          path: path.adminStaff,
          element: (
            <MainLayout>
              <StaffPage />
            </MainLayout>
          )
        },
        {
          path: path.adminReviews,
          element: (
            <MainLayout>
              <ReviewsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminBanners,
          element: (
            <MainLayout>
              <BannersPage />
            </MainLayout>
          )
        },
        {
          path: path.adminNotifications,
          element: (
            <MainLayout>
              <NotificationsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminDashboardStats,
          element: (
            <MainLayout>
              <DashboardStatsPage />
            </MainLayout>
          )
        },
        {
          path: path.adminRevenue,
          element: (
            <MainLayout>
              <RevenuePage />
            </MainLayout>
          )
        },
        {
          path: path.adminOrdersReport,
          element: (
            <MainLayout>
              <OrdersReportPage />
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
