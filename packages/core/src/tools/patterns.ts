import { defineTool } from './schema'

interface DesignPattern {
  jsx: string
  notes: string
}

const PATTERNS: Record<string, DesignPattern> = {
  card: {
    jsx: `<Frame name="Card" w={380} h="hug" flex="col" gap={16} p={20} bg="#FFFFFF" rounded={12} shadow="0 1 3 #00000015">
  <Text size={18} weight="bold" color="#111827">Card Title</Text>
  <Text size={14} color="#6B7280">Description text goes here with enough detail.</Text>
  <Frame flex="row" gap={8} items="center">
    <Frame w={80} h={36} flex="row" items="center" justify="center" bg="#3B82F6" rounded={8}>
      <Text size={13} weight="bold" color="#FFFFFF">Action</Text>
    </Frame>
    <Text size={13} color="#9CA3AF">Secondary</Text>
  </Frame>
</Frame>`,
    notes: '380px is the sweet spot for cards. p={20} inner < p={24} outer. gap={16} groups content. Button hugs content at 80px.'
  },

  'nav-bar': {
    jsx: `<Frame name="NavBar" w={1440} h={56} flex="row" items="center" px={24} bg="#FFFFFF" shadow="0 1 2 #0000000A">
  <Text size={18} weight="bold" color="#111827">Logo</Text>
  <Frame grow={1} />
  <Frame flex="row" gap={24} items="center">
    <Text size={14} color="#374151">Features</Text>
    <Text size={14} color="#374151">Pricing</Text>
    <Frame w={80} h={36} flex="row" items="center" justify="center" bg="#3B82F6" rounded={8}>
      <Text size={13} weight="bold" color="#FFFFFF">Sign Up</Text>
    </Frame>
  </Frame>
</Frame>`,
    notes: 'h={56} standard nav. grow={1} spacer pushes nav items right. Single CTA button stands out with color.'
  },

  'hero-section': {
    jsx: `<Frame name="Hero" w={1440} h="hug" flex="col" items="center" gap={24} py={80} px={24} bg="#F9FAFB">
  <Text size={40} weight="bold" color="#111827" textAlign="center">Main Headline Here</Text>
  <Text size={18} color="#6B7280" textAlign="center">Supporting text that explains the value proposition in one or two lines.</Text>
  <Frame flex="row" gap={12} items="center">
    <Frame w={140} h={44} flex="row" items="center" justify="center" bg="#3B82F6" rounded={8}>
      <Text size={15} weight="bold" color="#FFFFFF">Get Started</Text>
    </Frame>
    <Frame w={120} h={44} flex="row" items="center" justify="center" rounded={8} stroke="#D1D5DB" strokeWidth={1}>
      <Text size={15} color="#374151">Learn More</Text>
    </Frame>
  </Frame>
</Frame>`,
    notes: 'py={80} gives breathing room. size={40} hero heading. Two CTAs: primary filled, secondary outlined.'
  },

  form: {
    jsx: `<Frame name="Form" w={400} h="hug" flex="col" gap={20} p={24} bg="#FFFFFF" rounded={12}>
  <Text size={20} weight="bold" color="#111827">Form Title</Text>
  <Frame flex="col" gap={6} w="fill">
    <Text size={13} weight="medium" color="#374151">Label</Text>
    <Frame w="fill" h={40} flex="row" items="center" px={12} rounded={8} stroke="#D1D5DB" strokeWidth={1}>
      <Text size={14} color="#9CA3AF">Placeholder text</Text>
    </Frame>
  </Frame>
  <Frame w="fill" h={44} flex="row" items="center" justify="center" bg="#3B82F6" rounded={8}>
    <Text size={15} weight="bold" color="#FFFFFF">Submit</Text>
  </Frame>
</Frame>`,
    notes: 'w={400} form width. Input h={40}. Label size={13} above input. Submit button w="fill" spans full width.'
  },

  'list-item': {
    jsx: `<Frame name="ListItem" w={380} h={64} flex="row" items="center" gap={12} px={16} bg="#FFFFFF">
  <Ellipse w={40} h={40} bg="#E5E7EB" />
  <Frame flex="col" gap={2} grow={1}>
    <Text size={14} weight="bold" color="#111827">Item Title</Text>
    <Text size={12} color="#9CA3AF">Subtitle or metadata</Text>
  </Frame>
  <Text size={12} color="#9CA3AF">→</Text>
</Frame>`,
    notes: 'h={64} standard list item. Avatar 40px. grow={1} on text column. Arrow as navigation hint.'
  },

  modal: {
    jsx: `<Frame name="ModalBackdrop" w={1440} h={900} items="center" justify="center" flex="col" bg="#00000040">
  <Frame name="Modal" w={480} h="hug" flex="col" gap={20} p={24} bg="#FFFFFF" rounded={16} shadow="0 4 24 #00000020">
    <Frame flex="row" items="center" w="fill">
      <Text size={18} weight="bold" color="#111827" grow={1}>Modal Title</Text>
      <Text size={18} color="#9CA3AF">✕</Text>
    </Frame>
    <Text size={14} color="#6B7280">Modal body content goes here.</Text>
    <Frame flex="row" gap={8} justify="end" w="fill">
      <Frame w={80} h={40} flex="row" items="center" justify="center" rounded={8} stroke="#D1D5DB" strokeWidth={1}>
        <Text size={14} color="#374151">Cancel</Text>
      </Frame>
      <Frame w={80} h={40} flex="row" items="center" justify="center" bg="#3B82F6" rounded={8}>
        <Text size={14} weight="bold" color="#FFFFFF">Save</Text>
      </Frame>
    </Frame>
  </Frame>
</Frame>`,
    notes: 'w={480} modal. Backdrop with 25% black. Close button top-right. Actions right-aligned.'
  },

  sidebar: {
    jsx: `<Frame name="Sidebar" w={260} h={900} flex="col" gap={4} py={16} bg="#F9FAFB" stroke="#E5E7EB" strokeWidth={1}>
  <Frame flex="row" items="center" gap={8} px={16} pb={16}>
    <Ellipse w={32} h={32} bg="#3B82F6" />
    <Text size={14} weight="bold" color="#111827">App Name</Text>
  </Frame>
  {['☰ Dashboard', '○ Users', '◆ Settings'].map(item => (
    <Frame w="fill" h={40} flex="row" items="center" px={16} rounded={8}>
      <Text size={14} color="#374151">{item}</Text>
    </Frame>
  ))}
</Frame>`,
    notes: 'w={260} sidebar. h={40} nav items. px={16} consistent indent. Unicode icons for nav items.'
  },

  'dashboard-grid': {
    jsx: `<Frame name="DashboardGrid" w={1080} h="hug" flex="row" gap={20} wrap>
  {['Revenue', 'Users', 'Orders', 'Growth'].map(label => (
    <Frame w={250} h="hug" flex="col" gap={8} p={20} bg="#FFFFFF" rounded={12} shadow="0 1 3 #00000010">
      <Text size={12} color="#9CA3AF">{label}</Text>
      <Text size={28} weight="bold" color="#111827">1,234</Text>
      <Text size={12} color="#10B981">↑ 12%</Text>
    </Frame>
  ))}
</Frame>`,
    notes: 'Stat cards at 250px in a wrapping row. gap={20} between cards. Metric hierarchy: label → value → trend.'
  },

  'pricing-table': {
    jsx: `<Frame name="PricingTable" w={1080} h="hug" flex="row" gap={24} items="start" justify="center">
  {[{name:'Basic',price:'$9'},{name:'Pro',price:'$29'},{name:'Enterprise',price:'$99'}].map(plan => (
    <Frame w={320} h="hug" flex="col" gap={16} p={24} bg="#FFFFFF" rounded={12} stroke="#E5E7EB" strokeWidth={1}>
      <Text size={16} weight="bold" color="#111827">{plan.name}</Text>
      <Text size={32} weight="bold" color="#111827">{plan.price}<Text size={14} color="#9CA3AF">/mo</Text></Text>
      <Frame w="fill" h={1} bg="#E5E7EB" />
      {['Feature one', 'Feature two', 'Feature three'].map(f => (
        <Frame flex="row" gap={8} items="center"><Text size={14} color="#10B981">✓</Text><Text size={14} color="#374151">{f}</Text></Frame>
      ))}
      <Frame w="fill" h={44} flex="row" items="center" justify="center" bg="#3B82F6" rounded={8}>
        <Text size={14} weight="bold" color="#FFFFFF">Choose Plan</Text>
      </Frame>
    </Frame>
  ))}
</Frame>`,
    notes: 'Three columns at 320px. Price hierarchy: large number + small suffix. Divider separates price from features.'
  },

  'profile-header': {
    jsx: `<Frame name="ProfileHeader" w={400} h="hug" flex="col" items="center" gap={16} p={24} bg="#FFFFFF" rounded={12}>
  <Ellipse w={64} h={64} bg="#E5E7EB" />
  <Frame flex="col" gap={4} items="center">
    <Text size={18} weight="bold" color="#111827">User Name</Text>
    <Text size={14} color="#9CA3AF">user@example.com</Text>
  </Frame>
  <Frame flex="row" gap={32}>
    <Frame flex="col" items="center" gap={2}>
      <Text size={18} weight="bold" color="#111827">128</Text>
      <Text size={12} color="#9CA3AF">Posts</Text>
    </Frame>
    <Frame flex="col" items="center" gap={2}>
      <Text size={18} weight="bold" color="#111827">1.2k</Text>
      <Text size={12} color="#9CA3AF">Followers</Text>
    </Frame>
  </Frame>
</Frame>`,
    notes: 'Centered layout for profile. Avatar 64px. Stats in a row with gap={32} for visual separation.'
  },

}

export const getDesignPattern = defineTool({
  name: 'get_design_pattern',
  description: 'Get a reference JSX template for a common UI pattern. Call BEFORE rendering to see recommended structure, sizing, and spacing.',
  params: {
    pattern: {
      type: 'string',
      required: true,
      description: 'Pattern name',
      enum: ['card', 'nav-bar', 'hero-section', 'form', 'list-item', 'modal', 'sidebar', 'dashboard-grid', 'pricing-table', 'profile-header']
    }
  },
  execute: (_figma, { pattern }) => {
    const p = PATTERNS[pattern]
    return p ?? { error: `Unknown pattern "${pattern}". Available: ${Object.keys(PATTERNS).join(', ')}` }
  }
})
