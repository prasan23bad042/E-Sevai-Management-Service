# E-Sevai SaaS - Frontend Page Blueprints

This document details the layout structure, state models, UI widgets, and validation schemas required to build the E-Sevai frontend views.

---

## 1. Login View

### UI Layout
- **Layout**: Center split layout card. Left pane contains promotional E-Sevai SaaS branding, statistics highlights, and center guides. Right pane houses the login form.
- **Widgets**:
  - `InputEmail`: Email text field with native client-side validations.
  - `InputPassword`: Password field with mask toggle visibility eye button.
  - `ButtonSubmit`: Form submission button (with loading spinner feedback states).

### Data & State
- **Form State**:
  ```javascript
  const loginForm = { email: '', password: '' };
  ```
- **Validation**:
  - Email: Required, must match email regex format.
  - Password: Required, minimum 6 characters.
- **Redirection Matrix**:
  - Role `platform_admin` -> Redirects to `/admin/dashboard`
  - Role `center_owner` -> Redirects to `/owner/dashboard`
  - Role `manager` -> Redirects to `/manager/dashboard`
  - Role `staff` -> Redirects to `/staff/dashboard`

---

## 2. Platform Admin Dashboard

### UI Layout
- **Layout**: 3-column top highlights metrics grid followed by 2-column graph panes. Right drawer houses real-time system audit logs.
- **Widgets**:
  - `MetricCard`: Renders Centers count (Pending / Approved splits).
  - `RevenueTimeline`: Line charts showing Daily and Monthly revenue.
  - `RankedTable`: Top 5 centers and Top 5 services lists.

### Data & State
- **API Target**: `GET /api/v1/dashboard/admin`
- **Refresh Frequency**: Polled or loaded on page open. Utilizes caching indicators (`cached_at`).

---

## 3. Applications Processing View

### UI Layout
- **Layout**: Split screen. Left sidebar is a scrollable applications list with search and filter inputs (Status, Service, Date range). Main center pane displays the active application detail timeline.
- **Widgets**:
  - `SearchBar`: Live text filters query against Number, Name, Phone.
  - `TimelineCard`: Status checklist timeline (submitted, under_verification, completed).
  - `RemarksBox`: Textarea for adding comments.

### Data & State
- **Validation**:
  - Status updates to `rejected` require the `rejection_reason` string in a modal popup before submitting the HTTP request.
- **API Targets**:
  - Fetch list: `GET /api/v1/applications`
  - Assign staff: `PUT /api/v1/applications/:id/assign`
  - Update status: `PUT /api/v1/applications/:id/status`

---

## 4. Reports & Exporter Dashboard

### UI Layout
- **Layout**: Single column filter widget box followed by download attachment cards.
- **Widgets**:
  - `DateRangePicker`: Calendars specifying start and end thresholds.
  - `DropdownFilter`: Selectors for Center, Service, and Staff.
  - `ExportButton`: Action links triggering downloads for CSV, Excel, and PDF formats.

### Data & State
- **State Model**:
  ```javascript
  const activeFilters = {
    date_start: '2026-06-01',
    date_end: '2026-06-18',
    center_id: null,
    service_id: null,
    status: null,
    export_format: 'csv'
  };
  ```
