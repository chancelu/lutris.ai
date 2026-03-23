import { ref } from 'vue'

// ── Template Library ──
// Pre-built page templates that can be generated onto the canvas via AI

export interface Template {
  id: string
  name: string
  category: string
  description: string
  thumbnail: string // emoji
  prompt: string // AI prompt to generate this template
}

const TEMPLATES: Template[] = [
  // Landing Pages
  {
    id: 'landing-hero',
    name: 'Hero Landing Page',
    category: 'Landing',
    description: 'Full-width hero with headline, subtitle, CTA button, and background image',
    thumbnail: '🏠',
    prompt: 'Create a modern landing page hero section with a large bold headline "Build Something Amazing", a subtitle "The fastest way to ship your next product", a purple gradient CTA button "Get Started Free", and a subtle grid background pattern. Use dark theme with white text.',
  },
  {
    id: 'landing-features',
    name: 'Features Grid',
    category: 'Landing',
    description: '3-column feature cards with icons, titles, and descriptions',
    thumbnail: '✨',
    prompt: 'Create a features section with 3 cards in a row. Each card has an icon (emoji), a bold title, and a 2-line description. Card 1: "⚡ Lightning Fast" about performance. Card 2: "🔒 Secure by Default" about security. Card 3: "🎨 Beautiful Design" about UI. Dark cards on dark background with subtle borders.',
  },
  {
    id: 'landing-pricing',
    name: 'Pricing Table',
    category: 'Landing',
    description: '3-tier pricing cards with features list and CTA',
    thumbnail: '💰',
    prompt: 'Create a pricing section with 3 pricing cards: "Starter" at $9/mo, "Pro" at $29/mo (highlighted/recommended), and "Enterprise" at $99/mo. Each card has a feature list of 4-5 items with checkmarks. Pro card has a purple border and "Most Popular" badge. Dark theme.',
  },
  // Dashboard
  {
    id: 'dashboard-stats',
    name: 'Stats Dashboard',
    category: 'Dashboard',
    description: 'Top stat cards + chart area + sidebar navigation',
    thumbnail: '📊',
    prompt: 'Create a dashboard layout with: left sidebar (200px, dark, with nav items: Dashboard, Analytics, Users, Settings), top row of 4 stat cards (Total Users: 12,847, Revenue: $48,290, Active Now: 573, Growth: +12.5%), and a large chart placeholder area below. Dark theme with blue accents.',
  },
  {
    id: 'dashboard-table',
    name: 'Data Table',
    category: 'Dashboard',
    description: 'Searchable data table with pagination and filters',
    thumbnail: '📋',
    prompt: 'Create a data table view with: search bar at top, filter buttons (All, Active, Inactive), a table with columns (Name, Email, Status, Role, Actions) and 5 sample rows, and pagination at bottom showing "1-5 of 24". Dark theme with alternating row colors.',
  },
  // Auth
  {
    id: 'auth-login',
    name: 'Login Page',
    category: 'Auth',
    description: 'Centered login form with email, password, and social login',
    thumbnail: '🔐',
    prompt: 'Create a centered login page with: app logo at top, "Welcome Back" heading, email input field, password input field with show/hide toggle, "Forgot Password?" link, purple "Sign In" button, divider "or continue with", Google and GitHub social login buttons, and "Don\'t have an account? Sign Up" link at bottom. Dark theme, card style.',
  },
  {
    id: 'auth-signup',
    name: 'Sign Up Page',
    category: 'Auth',
    description: 'Registration form with name, email, password fields',
    thumbnail: '📝',
    prompt: 'Create a sign up page with: "Create Account" heading, full name input, email input, password input with strength indicator, confirm password input, checkbox "I agree to Terms", purple "Create Account" button, and "Already have an account? Sign In" link. Dark theme, centered card.',
  },
  // Profile
  {
    id: 'profile-settings',
    name: 'Settings Page',
    category: 'Profile',
    description: 'User settings with avatar, form fields, and save button',
    thumbnail: '⚙️',
    prompt: 'Create a settings page with: left sidebar tabs (Profile, Account, Notifications, Security), main area with profile section (avatar circle, "Change Photo" button), form fields (Display Name, Email, Bio textarea, Location), and a "Save Changes" button at bottom. Dark theme.',
  },
  // E-commerce
  {
    id: 'ecom-product',
    name: 'Product Card Grid',
    category: 'E-commerce',
    description: '4-column product cards with image, name, price, and rating',
    thumbnail: '🛍️',
    prompt: 'Create a product grid with 4 product cards in a row. Each card has: a product image placeholder (gray rectangle), product name, star rating (4.5/5), price ($49.99), and "Add to Cart" button. Include a "Shop All" header with filter dropdown. Dark theme.',
  },
  {
    id: 'ecom-checkout',
    name: 'Checkout Form',
    category: 'E-commerce',
    description: 'Two-column checkout with form and order summary',
    thumbnail: '💳',
    prompt: 'Create a checkout page with two columns: left side has shipping form (name, address, city, zip, country dropdown) and payment section (card number, expiry, CVV). Right side has order summary (2 items with thumbnails, subtotal, shipping, tax, total, and "Place Order" button). Dark theme.',
  },
]

const CATEGORIES = [...new Set(TEMPLATES.map((t) => t.category))]

const selectedCategory = ref<string | null>(null)
const searchQuery = ref('')

function getFilteredTemplates(): Template[] {
  let filtered = TEMPLATES
  if (selectedCategory.value) {
    filtered = filtered.filter((t) => t.category === selectedCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    )
  }
  return filtered
}

export function useTemplates() {
  return {
    templates: TEMPLATES,
    categories: CATEGORIES,
    selectedCategory,
    searchQuery,
    getFilteredTemplates,
  }
}
