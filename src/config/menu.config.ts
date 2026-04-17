import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Truck,
  BadgePercent,
  MessageSquare,
  Headset,
  ShieldCheck,
  Bot,
  Megaphone,
  BarChart3,
  Ticket,
  UserCheck
} from 'lucide-react'
import type { ComponentType } from 'react'
import path from '../constants/path'
import { ROLE_GROUPS, type SidebarRole } from '../config/role.config'

export interface MenuItem {
  title: string
  path: string
  roles: readonly SidebarRole[]
  children?: MenuItem[]
}

/**
 * Menu configuration for different user roles
 * Each menu item specifies which roles can access it
 * - admin: Full system access
 * - shipper: Delivery and order management
 * - support: Customer support and monitoring
 */
export const MENU_CONFIG: MenuItem[] = [
  // Core - All roles
  { title: 'Dashboard', path: path.dashboard, roles: ROLE_GROUPS.ALL_STAFF },

  // User Management - Admin only
  {
    title: 'Users',
    path: path.adminUsers,
    roles: ROLE_GROUPS.ADMIN_ONLY,
    children: [{ title: 'All User', path: path.adminUsers, roles: ROLE_GROUPS.ADMIN_ONLY }]
  },

  // Product Management - Admin & Support
  {
    title: 'Products',
    path: path.adminProducts,
    roles: ROLE_GROUPS.ADMIN_SUPPORT,
    children: [
      { title: 'All Product', path: path.adminProducts, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'Categories', path: path.adminCategories, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'Brands', path: path.adminBrands, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'Attributes & Variants', path: path.adminAttributesVariants, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'Product Images', path: path.adminProductImages, roles: ROLE_GROUPS.ADMIN_SUPPORT }
    ]
  },

  // Order Management - All roles
  {
    title: 'Orders',
    path: path.adminOrders,
    roles: ROLE_GROUPS.ALL_STAFF,
    children: [
      { title: 'All Orders', path: path.adminOrders, roles: ROLE_GROUPS.ALL_STAFF },
      { title: 'Order Items', path: path.adminOrderItems, roles: ROLE_GROUPS.ALL_STAFF }
    ]
  },

  // Shipment Management - Admin & Shipper
  {
    title: 'Shipments',
    path: path.adminShipments,
    roles: ROLE_GROUPS.ALL_STAFF,
    children: [
      { title: 'All Shipments', path: path.adminShipments, roles: ROLE_GROUPS.ALL_STAFF },
      { title: 'Shipper Assign', path: path.adminShipperAssign, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'Tracking Logs', path: path.adminTrackingLogs, roles: ROLE_GROUPS.ALL_STAFF }
    ]
  },

  // Promotion Management - Admin only
  {
    title: 'Promotions',
    path: path.adminPromotions,
    roles: ROLE_GROUPS.ADMIN_ONLY,
    children: [
      { title: 'All Promotion', path: path.adminPromotions, roles: ROLE_GROUPS.ADMIN_ONLY },
      { title: 'Product Promotions', path: path.adminProductPromotions, roles: ROLE_GROUPS.ADMIN_ONLY }
    ]
  },

  // Voucher Management - Admin only
  {
    title: 'Vouchers',
    path: path.adminVouchers,
    roles: ROLE_GROUPS.ADMIN_ONLY,
    children: [
      { title: 'All Vouchers', path: path.adminVouchers, roles: ROLE_GROUPS.ADMIN_ONLY },
      { title: 'Voucher Usages', path: path.adminVoucherUsages, roles: ROLE_GROUPS.ADMIN_ONLY }
    ]
  },

  // Staff Management - Admin only
  {
    title: 'Staff',
    path: path.adminStaff,
    roles: ROLE_GROUPS.ADMIN_ONLY,
    children: [
      { title: 'Staff', path: path.adminStaff, roles: ROLE_GROUPS.ADMIN_ONLY },
      { title: 'Delivery Staff', path: path.adminDeliveryStaff, roles: ROLE_GROUPS.ADMIN_ONLY }
    ]
  },

  // Customer Services - Admin & Shipper
  {
    title: 'Customer Services',
    path: path.adminReviews,
    roles: ROLE_GROUPS.ADMIN_SHIPPER,
    children: [{ title: 'Reviews', path: path.adminReviews, roles: ROLE_GROUPS.ADMIN_SHIPPER }]
  },

  // Support System - Admin & Support
  {
    title: 'Support System',
    path: path.adminFeedbackTickets,
    roles: ROLE_GROUPS.ADMIN_SUPPORT,
    children: [
      { title: 'Feedback Tickets', path: path.adminFeedbackTickets, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'Feedback Replies', path: path.adminFeedbackReplies, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'Feedback Ratings', path: path.adminFeedbackRatings, roles: ROLE_GROUPS.ADMIN_SUPPORT }
    ]
  },

  // Return & Warranty - All roles
  {
    title: 'Return & Warranty',
    path: path.adminReturns,
    roles: ROLE_GROUPS.ALL_STAFF,
    children: [
      { title: 'Returns', path: path.adminReturns, roles: ROLE_GROUPS.ALL_STAFF },
      { title: 'Return Policies', path: path.adminReturnPolicies, roles: ROLE_GROUPS.ALL_STAFF },
      { title: 'Warranty', path: path.adminWarranty, roles: ROLE_GROUPS.ALL_STAFF }
    ]
  },

  // AI System - Admin & Support
  {
    title: 'AI System',
    path: path.adminAiConversations,
    roles: ROLE_GROUPS.ADMIN_SUPPORT,
    children: [
      { title: 'AI Conversations', path: path.adminAiConversations, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'AI Feedback Analysis', path: path.adminAiFeedbackAnalysis, roles: ROLE_GROUPS.ADMIN_SUPPORT }
    ]
  },

  // Marketing - Admin only
  {
    title: 'Marketing',
    path: path.adminBanners,
    roles: ROLE_GROUPS.ADMIN_ONLY,
    children: [
      { title: 'Banners', path: path.adminBanners, roles: ROLE_GROUPS.ADMIN_ONLY },
      { title: 'Notifications', path: path.adminNotifications, roles: ROLE_GROUPS.ADMIN_ONLY }
    ]
  },

  // Analytics - Admin & Support
  {
    title: 'Analytics',
    path: path.adminDashboardStats,
    roles: ROLE_GROUPS.ADMIN_SUPPORT,
    children: [
      { title: 'Dashboard Stats', path: path.adminDashboardStats, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'Revenue', path: path.adminRevenue, roles: ROLE_GROUPS.ADMIN_SUPPORT },
      { title: 'Orders Report', path: path.adminOrdersReport, roles: ROLE_GROUPS.ADMIN_SUPPORT }
    ]
  }
]

export const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Users: Users,
  Products: Package,
  Orders: ShoppingCart,
  Shipments: Truck,
  Promotions: BadgePercent,
  'Customer Services': MessageSquare,
  'Support System': Headset,
  'Return & Warranty': ShieldCheck,
  'AI System': Bot,
  Marketing: Megaphone,
  Vouchers: Ticket,
  Staff: UserCheck,
  Analytics: BarChart3
}

export function filterMenuByRole(role: SidebarRole): MenuItem[] {
  return MENU_CONFIG.filter((item) => item.roles.includes(role)).map((item) => ({
    ...item,
    children: item.children?.filter((child) => child.roles.includes(role))
  }))
}
