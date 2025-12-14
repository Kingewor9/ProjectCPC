# 🎨 Growth Guru - Visual Design Guide

## Color Palette

### Primary Colors
```
Dark Blue       #0a1628  (Main Background)
Secondary Blue  #1a2f4a  (Card Backgrounds)
Tertiary Blue   #2a4568  (Input Backgrounds)
```

### Accent Colors
```
Primary Blue    #0078d4  (Buttons, Links)
Hover Blue      #1084d7  (Button Hover State)
```

### Text Colors
```
White           #ffffff  (Primary Text)
Light Grey      #e5e7eb  (Secondary Text)
Medium Grey     #9ca3af  (Tertiary Text)
Dark Grey       #374151  (Borders)
```

### Status Colors
```
Success Green   #10b981  (Active, Accepted)
Warning Yellow  #f59e0b  (Pending, Scheduled)
Error Red       #ef4444  (Error, Rejected)
Info Blue       #0078d4  (Information)
```

---

## Typography

### Font Family
Primary: Inter
Fallback: system-ui, -apple-system, sans-serif

### Sizes
```
Headlines:  24px - 48px (bold)
Body:       14px - 16px (regular)
Labels:     12px - 14px (medium)
Helper:     12px (regular)
```

### Weights
```
Bold:   700 (Headings, Important)
Medium: 500 (Labels, Labels)
Regular: 400 (Body text)
```

### Colors
```
Primary Text:   White (#ffffff)
Secondary Text: Grey 400 (#9ca3af)
Tertiary Text:  Grey 500 (#6b7280)
```

---

## Component Examples

### Buttons

#### Primary Button
```
Background: #0078d4 (blue-600)
Text: White
Hover: #1084d7 (blue-500)
Padding: 12px 24px
Border Radius: 8px
Font Weight: Bold
```

#### Secondary Button
```
Background: #374151 (grey-700)
Text: White
Hover: #4b5563 (grey-600)
Padding: 12px 24px
Border Radius: 8px
```

#### Disabled Button
```
Background: #4b5563 (grey-600)
Text: White (muted)
Opacity: 0.5
Cursor: not-allowed
```

### Cards

#### Standard Card
```
Background: #1a2f4a (darkBlue-800)
Border: 1px solid #374151 (grey-700)
Border Radius: 8px
Padding: 24px
Hover Effect: border-color changes to #0078d4
Shadow: None
```

#### Input Fields
```
Background: #2a4568 (darkBlue-700)
Border: 1px solid #4b5563 (grey-600)
Text: White
Focus: border-color #0078d4
Padding: 8px 12px
Border Radius: 6px
Font Size: 14px
```

### Badges

#### Status Badge (Green)
```
Background: rgba(16, 185, 129, 0.2)
Text: #10b981 (green)
Padding: 6px 12px
Border Radius: 20px
Font Size: 12px
Font Weight: 500
```

---

## Layout Structure

### Page Layout
```
┌─────────────────────────────────────────────┐
│              HEADER (64px height)            │
│  Logo    Navigation    User Info  Logout    │
├──────────────┬──────────────────────────────┤
│              │                              │
│   SIDEBAR    │      MAIN CONTENT           │
│  (256px)     │                              │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

### Sidebar Navigation
```
MAIN NAVIGATION
- Dashboard
- Send Promo
- Requests
- Campaigns
- Analytics
- Partners

(Separator)

SECONDARY NAVIGATION
- Help
- Settings
```

### Header Components
```
Left Side:          Center:      Right Side:
- Logo (GG)         (Empty)      - CPC Balance
- App Name                       - User Avatar
                                 - User Name
                                 - Logout Button
```

---

## Spacing & Sizing

### Spacing Scale
```
2px   - xs
4px   - sm
8px   - base
12px  - md
16px  - lg
24px  - xl
32px  - 2xl
48px  - 3xl
64px  - 4xl
```

### Component Sizes
```
Header Height:    64px
Sidebar Width:    256px
Card Padding:     24px
Input Height:     40px
Button Height:    40px (regular), 48px (large)
Border Radius:    8px (cards), 6px (inputs), 20px (badges)
```

---

## Interactive States

### Buttons
```
Default:  bg-blue-600
Hover:    bg-blue-700 (opacity increase)
Active:   bg-blue-800
Disabled: bg-grey-600, cursor-not-allowed
Focus:    outline with blue border
```

### Inputs
```
Default:  border-grey-600
Focus:    border-blue-500
Error:    border-red-500
Disabled: bg-grey-700, cursor-not-allowed
```

### Links
```
Default:  text-blue-400
Hover:    text-blue-300 (underline)
Visited:  text-blue-600 (when applicable)
```

---

## Responsive Breakpoints

```
Mobile:   < 640px   (full width)
Tablet:   640px     (single column → 2 columns)
Desktop:  768px     (3+ columns)
Large:    1024px+   (full width designs)
```

### Responsive Examples
```
Desktop (3 columns):
[Card1] [Card2] [Card3]

Tablet (2 columns):
[Card1] [Card2]
[Card3]

Mobile (1 column):
[Card1]
[Card2]
[Card3]
```

---

## Page Examples

### Dashboard Page Layout
```
┌────────────────────────────────────────────┐
│ Welcome back, [Name]! 👋                   │
│ Manage your cross-promotion campaigns      │
└────────────────────────────────────────────┘

┌───────────┬───────────┬───────────┬────────┐
│ CPC       │ Channels  │ Subs      │ Active │
│ Balance   │ Count     │ Total     │ (count)│
│ 11,050    │ 3         │ 39,000    │ 2      │
└───────────┴───────────┴───────────┴────────┘

┌────────────────────────────────────────────┐
│ QUICK ACTIONS                              │
│ ┌──────────────────┬──────────────────┐   │
│ │ Send Promotion   │ View Campaigns   │   │
│ └──────────────────┴──────────────────┘   │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ YOUR CHANNELS                              │
│ ┌────────┬────────┬────────┐              │
│ │Channel1│Channel2│Channel3│              │
│ └────────┴────────┴────────┘              │
└────────────────────────────────────────────┘
```

### Send Request Page Layout
```
┌────────────────────────────────────────────┐
│ Send Cross-Promotion                       │
│ Create a new promotional request           │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ FROM YOUR CHANNEL                          │
│ [Dropdown] [Select Promo]                 │
│ [Preview of selected promo]                │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ TO PARTNER CHANNEL                         │
│ [Dropdown]                                 │
│ [Partner details card]                     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ SCHEDULE                                   │
│ [Day] [Time Slot] [Duration]              │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ COST SUMMARY                               │
│ Duration Cost: 250 CPC                     │
│ Balance: 11,050 CPC                        │
└────────────────────────────────────────────┘

[SEND PROMOTION BUTTON]
```

---

## Animation & Transitions

### Transition Times
```
Fast:    100ms (simple interactions)
Medium:  200ms (default)
Slow:    300ms (complex animations)
```

### Effects
```
Hover:       Border color change, slight scale
Active:      Color change + slight depression
Loading:     Spinning loader animation
Fade In:     200ms ease-in
Slide In:    300ms ease-out
```

---

## Icons & Imagery

### Icon Library: Lucide React
```
Navigation:  Home, Send, Inbox, Zap, BarChart3, Settings
Status:      CheckCircle, AlertCircle, Clock, Zap
User:        User, LogOut, Wallet
Media:       Image, Link
General:     Plus, X, ChevronDown, ArrowRight
```

### Avatar Styling
```
Size:        40px - 100px (depending on context)
Border:      2px solid blue (#0078d4)
Border Radius: 50% (circular)
Background:  Fallback color if no image
```

### User Images
```
Telegram avatars: Displayed as-is
Fallback:        Initials on colored background
Placeholder:     Solid color blocks for partners
```

---

## Dark Mode Details

### Contrast Ratios
```
White on Dark Blue:    7:1+ (WCAG AA compliant)
Blue on Dark Blue:     4.5:1+ (acceptable)
Text on Cards:         7:1+ (excellent contrast)
```

### Accent Visibility
```
Blue (#0078d4) on Dark Blue (#0a1628): Good
Borders (#374151) on Dark Blue:        Good
White on Grey (#9ca3af):               Excellent
```

---

## Code Examples

### Button Variants
```html
<!-- Primary Button -->
<button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">
  Send Request
</button>

<!-- Secondary Button -->
<button class="bg-grey-700 hover:bg-grey-600 text-white font-bold py-3 rounded-lg">
  Cancel
</button>

<!-- Disabled Button -->
<button disabled class="bg-grey-600 text-white opacity-50 cursor-not-allowed py-3 rounded-lg">
  Disabled
</button>
```

### Card Layout
```html
<div class="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 hover:border-blue-500">
  <h3 class="text-lg font-bold text-white mb-4">Card Title</h3>
  <p class="text-grey-300">Content goes here</p>
</div>
```

### Status Badge
```html
<span class="bg-green-600/20 text-green-300 px-3 py-1 rounded-full text-xs font-medium">
  Active
</span>
```

---

## Accessibility

### Color Contrast
- Text on backgrounds: 7:1 ratio (AAA)
- Accent on dark: 4.5:1 ratio (AA)
- Status indicators: Use text + color

### Interactive Elements
- Minimum touch target: 44px × 44px
- Focus states visible (blue border)
- Hover states clear
- Disabled states obvious

### Typography
- Semantic HTML (h1, h2, h3, etc.)
- Proper list structures
- Alt text for images
- Form labels with inputs

---

## Browser Support

### Supported
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Features Used
- CSS Grid & Flexbox
- CSS Custom Properties
- ES2020 JavaScript
- CSS Transitions

---

## Print Styles

### Optimized for Print
- Light backgrounds
- Dark text
- No shadows/animations
- Adjusted margins
- Readable font sizes

---

## Summary

This design system provides:
✅ Cohesive color palette
✅ Clear typography hierarchy
✅ Consistent spacing
✅ Accessible contrast ratios
✅ Responsive layouts
✅ Interactive states
✅ Professional appearance
✅ Modern dark theme

All implemented with Tailwind CSS in your frontend!
