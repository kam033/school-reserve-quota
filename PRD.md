# Planning Guide

نظام ذكي متكامل لإدارة الجداول المدرسية والحصص الاحتياطية يعتمد على ملفات XML المستخرجة من برنامج aSc Timetables لتسهيل عمل إدارات المدارس في تنظيم الجداول وتوزيع الحصص ومتابعة غياب المعلمين.

**Experience Qualities**:
1. **Efficient** - System must process XML files quickly and present data in immediately actionable formats for busy school administrators
2. **Trustworthy** - Arabic text rendering, data integrity checks, and clear error messaging build confidence in critical scheduling decisions
3. **Accessible** - Responsive design enables mobile access for on-the-go absence reporting and schedule checking during the school day

**Complexity Level**: Light Application (multiple features with basic state)
This system handles XML parsing, user authentication, role-based views, and data management but doesn't require complex backend infrastructure. All data persists in browser storage, making it ideal for individual school deployments.

## Essential Features

### XML File Upload & Parsing
- **Functionality**: Upload and parse aSc Timetables XML files containing teacher schedules, subjects, and periods
- **Purpose**: Automate schedule data entry to eliminate manual input errors and save administrative time
- **Trigger**: User clicks "تحميل الجدول" button and selects XML file
- **Progression**: File select → Upload → XML parsing → UTF-8 validation → Data extraction → Error checking → Confirmation message → Redirect to schedules view
- **Success criteria**: System correctly extracts teacher names, subjects, periods, and days; displays warnings for encoding issues or duplicates; shows success toast with data summary

### User Authentication & Role Management
- **Functionality**: Three-tier access system (System Admin, School Director, Teacher) with role-based permissions
- **Purpose**: Secure access control ensuring users only see and modify data appropriate to their role
- **Trigger**: User clicks "تسجيل الدخول" and enters credentials
- **Progression**: Login click → Credential entry → Role verification → Permission assignment → Dashboard redirect based on role
- **Success criteria**: System correctly restricts features by role; admins see all schools, directors see their school only, teachers see personal schedules

### Teacher Schedule Display
- **Functionality**: Auto-generated visual timetables showing each teacher's daily and weekly class assignments
- **Purpose**: Quick reference for teachers and administrators to view teaching loads and availability
- **Trigger**: Navigate to "جداول المعلمين" section
- **Progression**: Section access → Teacher selection → Schedule retrieval → Grid layout rendering → Period highlighting
- **Success criteria**: All periods display correctly in Arabic; daily/weekly totals accurate; current period highlighted; mobile-responsive grid

### Absence Recording & Substitute Assignment
- **Functionality**: Log teacher absences and assign available substitute teachers for specific periods
- **Purpose**: Maintain continuous instruction by quickly identifying and assigning substitute coverage
- **Trigger**: Click "غياب المعلمين" and select absent teacher
- **Progression**: Teacher selection → Date/period selection → Available substitute list → Substitute assignment → Notification → Statistics update
- **Success criteria**: System only shows substitutes free during that period; prevents double-booking; updates coverage statistics instantly; mobile-friendly interface

### Statistical Dashboard
- **Functionality**: Real-time analytics showing teacher counts, subject distribution, absence rates, and coverage metrics
- **Purpose**: Data-driven insights for administrative planning and resource allocation
- **Trigger**: Click "تقرير إحصائي" or view on homepage
- **Progression**: Dashboard access → Data aggregation → Chart rendering → Metric calculation → Display update
- **Success criteria**: All metrics accurate; charts render smoothly; data updates when new absences recorded; shows warnings for high absence rates

## Edge Case Handling

- **Malformed XML** - Display specific error message in Arabic indicating line number and issue type; offer file validation tips
- **Mixed/Incorrect Encoding** - Auto-detect encoding issues, show warning with affected teacher names, provide UTF-8 conversion guidance
- **Duplicate Teachers** - Flag duplicates with warning badge, allow admin to merge or keep separate with confirmation dialog
- **No Available Substitutes** - Show message indicating all teachers are occupied; suggest checking adjacent periods or marking as uncovered
- **Concurrent Absences** - Handle multiple teachers absent same period; show coverage priority list; allow partial assignment
- **Past Date Editing** - Warn when editing historical data; require confirmation; maintain audit trail of changes

## Design Direction

The interface should evoke feelings of professional efficiency and calm organization - reflecting the structured environment of educational institutions while maintaining approachable warmth. The design should feel trustworthy and authoritative without being intimidating, using clean layouts that reduce cognitive load for administrators making time-sensitive decisions throughout the school day. A minimal interface better serves the core purpose, keeping focus on data clarity and quick action rather than decorative elements.

## Color Selection

Triadic color scheme using educational-appropriate colors that convey trust, clarity, and organization while ensuring excellent readability for extended use.

- **Primary Color**: Deep Blue (#2563eb / oklch(0.55 0.18 264)) - Represents trust, stability, and professionalism associated with educational institutions
- **Secondary Colors**: Warm Amber (#f59e0b / oklch(0.75 0.15 70)) for accents and highlights; Soft Gray (#64748b / oklch(0.52 0.02 250)) for secondary text and borders
- **Accent Color**: Vibrant Teal (#14b8a6 / oklch(0.70 0.12 180)) - Used for success states, available periods, and active selections to draw attention without overwhelming
- **Foreground/Background Pairings**:
  - Background White (oklch(0.99 0 0)): Dark Blue-Gray text (oklch(0.25 0.02 250)) - Ratio 12.5:1 ✓
  - Card Light Gray (oklch(0.97 0 0)): Dark Blue-Gray text (oklch(0.25 0.02 250)) - Ratio 11.2:1 ✓
  - Primary Deep Blue (oklch(0.55 0.18 264)): White text (oklch(0.99 0 0)) - Ratio 7.8:1 ✓
  - Secondary Warm Amber (oklch(0.75 0.15 70)): Dark Brown text (oklch(0.30 0.05 60)) - Ratio 6.2:1 ✓
  - Accent Vibrant Teal (oklch(0.70 0.12 180)): White text (oklch(0.99 0 0)) - Ratio 5.1:1 ✓
  - Muted Light Gray (oklch(0.95 0 0)): Medium Gray text (oklch(0.50 0.02 250)) - Ratio 5.8:1 ✓

## Font Selection

Typography should convey clarity and readability in both Arabic and English contexts, with fonts that feel modern yet professional for an educational management tool. Tajawal for Arabic provides excellent legibility and professional appearance, while Inter for English/numbers ensures consistency and readability in mixed-language interfaces.

- **Typographic Hierarchy**:
  - H1 (Page Title): Tajawal Bold / 32px / -0.02em letter spacing - Main section headers like "جداول المعلمين"
  - H2 (Section Headers): Tajawal SemiBold / 24px / -0.01em - Subsection headers like teacher names
  - H3 (Card Titles): Tajawal Medium / 18px / 0em - Individual card headers and labels
  - Body (Content): Tajawal Regular / 16px / 0.01em / 1.6 line height - General text content
  - Small (Meta Info): Tajawal Regular / 14px / 0.01em - Timestamps, counts, secondary information
  - Button Text: Tajawal Medium / 16px / 0em - All interactive elements

## Animations

Animations should be purposeful and efficient - providing immediate feedback for interactions while maintaining the professional atmosphere of an administrative tool. Movements should feel responsive rather than decorative, with quick transitions that don't impede workflow during busy school operations.

- **Purposeful Meaning**: Subtle fade-ins when loading new schedule data communicate data refresh; slide transitions between different teacher views maintain spatial context
- **Hierarchy of Movement**: Priority to interactive feedback (button presses, form submissions) and status changes (absence recorded, substitute assigned); minimal animation for purely informational displays to maintain focus on content

## Component Selection

- **Components**:
  - **Dialog** - User login, new user creation, absence recording forms requiring focused input
  - **Card** - Teacher schedule displays, statistical summaries, individual absence records with subtle shadows for depth
  - **Table** - Schedule grids with responsive column sizing; bordered cells for clear period delineation
  - **Button** - Primary (upload, submit), Secondary (cancel, back), Ghost (table actions) with appropriate visual hierarchy
  - **Select** - Teacher selection, date/period pickers with search functionality for large lists
  - **Alert** - XML validation warnings, duplicate detection, encoding issues with appropriate severity colors
  - **Badge** - Period counts, absence indicators, substitute assignments with color coding
  - **Tabs** - Switch between daily/weekly views, different school sections
  - **Separator** - Visual division between dashboard sections without heavy borders
  
- **Customizations**:
  - **Schedule Grid Component** - Custom component for displaying timetable with color-coded periods, hover tooltips showing subject details
  - **RTL Layout Wrapper** - Ensure proper right-to-left layout for Arabic interface elements
  - **XML Upload Zone** - Drag-and-drop area with file validation preview
  
- **States**:
  - Buttons: Subtle shadow on default, deeper shadow and scale on hover, pressed state with slight darkening, disabled state at 50% opacity
  - Inputs: Border color changes from gray to primary on focus, red border on validation error, green checkmark on successful validation
  - Schedule cells: Light background on default, highlight with teal accent on hover, deeper accent for current period, gray strikethrough for absent teacher
  
- **Icon Selection**:
  - Upload (CloudArrowUp) for file upload
  - Calendar (CalendarBlank) for date selection
  - User (User) for teacher profiles
  - Warning (WarningCircle) for validation errors
  - Check (CheckCircle) for successful operations
  - List (ListBullets) for schedule views
  - ChartBar for statistics
  - SignIn for login
  
- **Spacing**: Base spacing scale of 4px (Tailwind's 1 unit); cards use p-6, buttons use px-4 py-2, sections separated by mb-8, grid gaps of gap-4
  
- **Mobile**: 
  - Schedule tables switch to card-based layout below 768px with vertical period lists
  - Navigation converts to hamburger menu with sidebar drawer
  - Forms stack vertically with full-width inputs
  - Dashboard statistics arrange in single column
  - Large touch targets (min 44px) for all interactive elements
  - Sticky header with quick actions always visible
