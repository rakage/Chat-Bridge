# ChatBridge Hero Section - Implementation Guide

## Overview
This is a bespoke, high-conversion SaaS hero section built for the omnichannel chatbot dashboard following the JSON design specification. The hero features a sophisticated black-and-white design with glassmorphism effects and interactive components.

## Components Structure

### Main Components
- **HeroSection.tsx** - Main hero component with two-column layout
- **OmnichannelPreviewCard.tsx** - Interactive preview showing live inbox across channels
- **ValuePropositions.tsx** - Feature cards section (optional)

### UI Components (Shadcn)
- tabs.tsx - Channel switcher tabs
- hover-card.tsx - For interactive tooltips
- button.tsx, card.tsx, badge.tsx, input.tsx, avatar.tsx, scroll-area.tsx (already existing)

## Design Tokens

### Color Palette (Black & White Only)
```css
--bg: #0A0A0A (Primary background)
--surface: #111111
--elevated: #141414
--ink: #FFFFFF
--muted: #A1A1AA
--border: #1F1F1F
--overlay: rgba(255,255,255,0.06)
```

### Typography
- **Display**: Inter 900 / -2% tracking
- **Heading**: Inter 800 / -1% tracking
- **Body**: Inter 400 / 0% tracking
- **Mono**: JetBrains Mono 500

### Border Radius
- sm: 8px
- md: 14px
- lg: 20px
- xl: 24px

## Features

### 1. Two-Column Layout
- **Left**: Content (eyebrow, headline, CTAs, trust badges)
- **Right**: Interactive omnichannel inbox preview
- Responsive: Stacks on mobile/tablet

### 2. Interactive Omnichannel Preview
- Tabs for 5 channels: WhatsApp, Instagram, Facebook Messenger, Web Chat, Email
- Mock conversation threads per channel
- Message composer with suggested replies
- Live badge indicator
- Glass morphism design with backdrop blur

### 3. Social Proof Elements
- Trust badges (Meta, Shopify, Stripe, Slack)
- Statistics (1.2M+ conversations, 24% CSAT uplift, -38% reply time)
- SOC2-ready & GDPR compliance badges

### 4. Visual Effects
- Layered background (gradient + noise + grid lines)
- Animated gradient orbs
- Glass morphism cards with backdrop blur
- Hover effects on tabs and buttons
- Entrance animations (defined but not implemented in this version)

## Responsive Breakpoints
- **Desktop**: ≥1280px
- **Tablet**: ≥991px
- **Mobile**: ≥479px

### Mobile Optimizations
- Columns stack vertically
- Interactive card shown first
- Reduced text sizes
- Horizontal scroll for tabs
- Hidden trust logo strip on very small screens

## Usage

### Basic Implementation
```tsx
import { HeroSection } from "@/components/hero/HeroSection";

export default function HomePage() {
  return <HeroSection />;
}
```

### With Value Propositions
```tsx
import { HeroSection } from "@/components/hero/HeroSection";
import { ValuePropositions } from "@/components/hero/ValuePropositions";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ValuePropositions />
    </>
  );
}
```

## Customization

### Update Brand Copy
Edit `HeroSection.tsx`:
- Eyebrow text: "Omnichannel Chatbot Platform"
- Headline: Main value proposition
- Subheadline: Supporting description
- Trust badges: Update company logos/names

### Modify Channels
Edit `OmnichannelPreviewCard.tsx`:
- Add/remove channels in `channels` array
- Update mock messages per channel in `mockMessages` object
- Customize suggested replies

### Color Theme
While the design is black & white only, you can adjust opacity and gradients in component classNames:
- `bg-white/5` - 5% white opacity
- `border-zinc-800` - Border colors
- `text-zinc-400` - Muted text

## Performance Notes

- **Target LCP**: <2.2s
- **Strategy**: Static poster + lazy interactions
- **Image formats**: AVIF, WebP (for production assets)
- All animations respect `prefers-reduced-motion`

## Accessibility

- Minimum contrast ratio: 7:1
- Focus states enabled on all interactive elements
- ARIA labels on interactive card and tabs
- Keyboard navigation support
- Screen reader friendly

## A/B Testing Slots

The design includes A/B test placeholders for:
- Headline variants
- CTA button copy
- Subheadline messaging

## Next Steps

1. **Replace placeholder icons** with actual SVG assets for channels
2. **Add real customer logos** for trust section
3. **Implement entrance animations** using Framer Motion (optional)
4. **Connect CTAs** to actual signup/demo flows
5. **Add analytics tracking** on button clicks
6. **Optimize images** to AVIF/WebP formats
7. **Add i18n support** for multiple languages (template included in JSON spec)

## Dependencies

```json
{
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-hover-card": "^1.1.15",
  "lucide-react": "^0.468.0",
  "tailwindcss": "^3.4.17",
  "next": "15.5.0"
}
```

## File Structure
```
src/
├── components/
│   ├── hero/
│   │   ├── HeroSection.tsx
│   │   ├── OmnichannelPreviewCard.tsx
│   │   └── ValuePropositions.tsx
│   └── ui/
│       ├── tabs.tsx
│       ├── hover-card.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── input.tsx
│       ├── avatar.tsx
│       └── scroll-area.tsx
├── app/
│   ├── page.tsx (updated)
│   └── globals.css (updated with animations)
```

## Credits
Design spec: ChatBridge Omnichannel Chatbot Platform
UI Framework: shadcn/ui
Icons: Lucide React
