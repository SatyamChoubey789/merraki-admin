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

export interface ActivityLog {
  id: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  timestamp: string;
}

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

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  status: string;
  featured?: boolean;
  tags?: string[];
  readingTime?: number;
  scheduledAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

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

export interface Template {
  id: number;
  slug: string;
  title: string;
  description?: string;
  detailed_description?: string;
  price_inr: number;
  category_id: number;
  category?: {
    id: number;
    name: string;
    slug: string;
    color: string;
    icon: string;
  };
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

export interface test{
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface TestQuestion{
  id: string;
  testId: string;
  orderNumber: number;
  category: string;
  weight: number;
  questionText: string;
  questionType: "multiple-choice" | "true-false" | "short-answer";
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface TestSubmission{
  id: string;
  testId: string;
  userId: string;
  userName: string;
  userEmail: string;
  completedAt: string;
  answers: Array<{
    questionId: string;
    selectedOption: string;
    isCorrect: boolean;
  }>;
  score: number;
  submittedAt: string;
}