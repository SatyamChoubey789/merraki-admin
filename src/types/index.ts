// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalBlogPosts: number;
  totalTemplates: number;
  userGrowth: number;
  revenueGrowth: number;
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  dailyRevenue: Array<{ date: string; value: number }>;
  conversionFunnel: {
    visitors: number;
    signups: number;
    testCompleted: number;
    purchased: number;
  };
  sparklines: {
    users?: number[];
    orders?: number[];
    revenue?: number[];
    pending?: number[];
    posts?: number[];
    templates?: number[];
  };
}

// ── Activity ──────────────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  timestamp: string;
}

// ── Orders ────────────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  transactionId?: string;
  createdAt: string;
  timeline?: Array<{
    status: string;
    note?: string;
    adminName?: string;
    timestamp: string;
  }>;
}

// ── Users ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  banned: boolean;
  segment?: string;
  orderCount?: number;
  totalSpent?: number;
  testCount?: number;
  createdAt: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

// ── Newsletter ────────────────────────────────────────────────────────────────
export interface Newsletter {
  id: string;
  subject: string;
  content: string;
  status: string;
  recipientCount?: number;
  openRate?: number;
  createdAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  status: string;
  subscribedAt: string;
}

// ── Contact ───────────────────────────────────────────────────────────────────
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  replies: Array<{
    id: string;
    message: string;
    sentBy: string;
    createdAt: string;
  }>;
}

// ── Templates ─────────────────────────────────────────────────────────────────
export interface TemplateCategory {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  template_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: number;
  slug: string;
  title: string;
  description?: string;
  detailed_description?: string;
  price: number;
  category_id: number;
  category?: TemplateCategory;
  tags: string[] | null;
  downloads_count: number;
  views_count: number;
  rating: number;
  rating_count: number;
  status: "active" | "inactive" | "draft";
  is_featured: boolean;
  file_url: string;
  thumbnail_url?: string;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

// ── Blog — aligned to Go structs ──────────────────────────────────────────────

/**
 * Matches Go BlogAuthor struct.
 * social_links is JSONMap in Go → keyed object in TS.
 */
export interface BlogAuthor {
  id: number;
  admin_id?: number;
  name: string;
  slug: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  social_links?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
    github?: string;
    instagram?: string;
    [key: string]: string | undefined;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  post_count?: number;
}

/**
 * Matches Go BlogCategory struct.
 * Supports nested categories via parent_id.
 */
export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  post_count?: number;
}

/**
 * Matches Go BlogPost + BlogPostWithRelations.
 * author / category are optional joined fields from list & detail APIs.
 * is_featured intentionally omitted — not used on frontend.
 */
export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image_url?: string;
  author_id?: number;
  category_id?: number;
  tags: string[] | null;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[] | null;
  status: "draft" | "published" | "scheduled" | "archived";
  views_count: number;
  reading_time_minutes?: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
  author?: BlogAuthor;
  category?: BlogCategory;
}

// ── Generic paginated response wrapper ───────────────────────────────────────
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
