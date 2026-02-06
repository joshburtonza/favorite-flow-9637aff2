
# Implementation Plan: Pre-Testing Features Package

## Executive Summary
This plan covers four robust systems needed before the platform goes into testing with staff:

1. **Feedback Collection System** - Floating widget for staff to report bugs, suggestions, and issues
2. **Staff Interview Templates** - Questionnaire system to capture each staff member's workflow
3. **Testing Checklist System** - Interactive checklist to validate all platform features
4. **Shipment Folder Templates** - Auto-create standard folder structures when new shipments are created

---

## Feature 1: Feedback Collection System

### What It Does
A floating feedback button (separate from FLAIR) that staff can click anytime to report:
- Bugs and errors
- Suggestions for improvement  
- "Something doesn't work as expected"
- General feedback

Staff can select a category, write their feedback, optionally attach a screenshot reference, and submit. All feedback is stored in the database for admin review.

### User Experience
1. Staff sees a small "Feedback" button fixed in the corner
2. Clicking opens a quick form with:
   - Category dropdown (Bug, Suggestion, Question, Other)
   - Priority selection (Low, Medium, High, Critical)
   - Affected area (which page/feature)
   - Description text area
   - Optional: current page auto-captured
3. Submit saves to database and shows confirmation
4. Admins can view all feedback in a dedicated page

### Components to Create
- `src/components/feedback/FeedbackButton.tsx` - Floating button component
- `src/components/feedback/FeedbackDialog.tsx` - The feedback submission form
- `src/components/feedback/FeedbackList.tsx` - Admin view of all feedback
- `src/hooks/useFeedback.ts` - CRUD hooks for feedback
- `src/pages/Feedback.tsx` - Admin page to review feedback

### Database Changes
New table: `staff_feedback`
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- category (enum: bug, suggestion, question, other)
- priority (enum: low, medium, high, critical)
- affected_area (text) - page/feature name
- current_url (text) - auto-captured URL
- title (text)
- description (text)
- status (enum: new, in_progress, resolved, dismissed)
- admin_notes (text)
- resolved_by (uuid)
- resolved_at (timestamp)
- created_at (timestamp)

RLS: Users can create and view their own feedback; Admins can view all and manage

---

## Feature 2: Staff Interview Templates

### What It Does
A structured questionnaire system to gather information from each staff member about their daily workflows, pain points, and feature requests. This data helps tailor the platform to actual use cases.

### User Experience
1. Admin creates interview sessions for each staff member
2. Staff receives a notification to complete their interview
3. Interview form includes:
   - Role and department info
   - Daily tasks checklist
   - Tools currently used
   - Pain points and challenges
   - Feature wishlist
   - Time spent on specific activities
4. Responses are saved and viewable by admins
5. Admins can export responses for analysis

### Components to Create
- `src/components/interviews/StaffInterviewForm.tsx` - The questionnaire form
- `src/components/interviews/InterviewResponseView.tsx` - View individual responses
- `src/components/interviews/InterviewDashboard.tsx` - Admin overview
- `src/hooks/useStaffInterviews.ts` - CRUD hooks
- `src/pages/StaffInterviews.tsx` - Admin page

### Database Changes
New table: `staff_interviews`
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- assigned_by (uuid)
- status (enum: pending, in_progress, completed)
- due_date (date)
- completed_at (timestamp)
- created_at (timestamp)

New table: `staff_interview_responses`
- id (uuid, primary key)
- interview_id (uuid, references staff_interviews)
- question_key (text) - identifier for the question
- question_text (text)
- response_type (enum: text, rating, multiple_choice, checklist)
- response_value (jsonb) - flexible storage for any response type
- created_at (timestamp)

Pre-defined interview questions stored in code (not database) for consistency.

---

## Feature 3: Testing Checklist System

### What It Does
An interactive checklist where staff can systematically test each platform feature and mark it as Pass, Fail, or Needs Review. This creates a documented testing trail.

### User Experience
1. Testing checklist page shows all features grouped by category
2. Each item has:
   - Feature name and description
   - Pass/Fail/Skip buttons
   - Notes field for issues
   - Assigned tester (optional)
3. Progress bar shows overall completion
4. Failed items are highlighted and can be exported
5. Multiple test runs can be tracked over time

### Components to Create
- `src/components/testing/TestingChecklist.tsx` - Main checklist component
- `src/components/testing/TestingCategorySection.tsx` - Grouped sections
- `src/components/testing/TestingItemRow.tsx` - Individual test item
- `src/components/testing/TestingProgress.tsx` - Progress overview
- `src/hooks/useTestingChecklist.ts` - CRUD hooks
- `src/pages/TestingChecklist.tsx` - Full page

### Database Changes
New table: `testing_runs`
- id (uuid, primary key)
- name (text) - "Pre-Launch Test Run 1"
- description (text)
- created_by (uuid)
- status (enum: active, completed, archived)
- started_at (timestamp)
- completed_at (timestamp)
- created_at (timestamp)

New table: `testing_results`
- id (uuid, primary key)
- run_id (uuid, references testing_runs)
- feature_key (text) - identifier matching predefined features
- category (text)
- tester_id (uuid)
- result (enum: untested, pass, fail, skip, needs_review)
- notes (text)
- tested_at (timestamp)
- created_at (timestamp)

Predefined test items stored in code with categories:
- Authentication (login, logout, password reset)
- Shipments (create, update, delete, costs)
- Suppliers (CRUD, ledger, balance)
- Clients (CRUD, invoices)
- Documents (upload, folders, workflow)
- File Management (upload, download, trash)
- Invoices (create, PDF export)
- Tasks (create, assign, complete)
- Messages (send, receive, attachments)
- Calendar (events, reminders)
- FLAIR AI (queries, updates)
- Reports (financials, exports)

---

## Feature 4: Shipment Folder Templates

### What It Does
Automatically creates a standardized folder structure when a new shipment is created. This ensures consistent document organization across all shipments.

### Folder Structure
When a shipment is created, auto-create:
```text
LOT-[number]/
  Documents/
  Invoices/
  Customs/
  Payment Proofs/
  Correspondence/
```

### Implementation Approach
1. Add a database trigger or modify `useCreateShipment` hook
2. When shipment created, automatically create shipment-specific folder
3. Create child folders within it
4. Link folders to shipment via `shipment_id` column in document_folders

### Components to Modify
- `src/hooks/useShipments.ts` - Extend useCreateShipment
- `src/hooks/useDocumentFolders.ts` - Add createShipmentFolders function

### Database Changes
Add column to `document_folders`:
- shipment_id (uuid, nullable, references shipments)

New table: `folder_templates`
- id (uuid, primary key)
- name (text) - "Shipment Default"
- template_type (text) - "shipment" or "client"
- folder_structure (jsonb) - array of folder names
- is_active (boolean)
- created_at (timestamp)

---

## Navigation Updates

Add new menu items to `AppLayout.tsx`:
- Feedback (visible to all, icon: MessageSquarePlus)
- Testing Checklist (admin only, icon: ClipboardCheck)
- Staff Interviews (admin only, icon: ClipboardList)

---

## Technical Summary

### New Files to Create (17 files)
1. `src/pages/Feedback.tsx`
2. `src/pages/TestingChecklist.tsx`
3. `src/pages/StaffInterviews.tsx`
4. `src/components/feedback/FeedbackButton.tsx`
5. `src/components/feedback/FeedbackDialog.tsx`
6. `src/components/feedback/FeedbackList.tsx`
7. `src/components/testing/TestingChecklist.tsx`
8. `src/components/testing/TestingCategorySection.tsx`
9. `src/components/testing/TestingItemRow.tsx`
10. `src/components/testing/TestingProgress.tsx`
11. `src/components/interviews/StaffInterviewForm.tsx`
12. `src/components/interviews/InterviewResponseView.tsx`
13. `src/components/interviews/InterviewDashboard.tsx`
14. `src/hooks/useFeedback.ts`
15. `src/hooks/useTestingChecklist.ts`
16. `src/hooks/useStaffInterviews.ts`
17. `src/lib/testing-definitions.ts` - Predefined test items and interview questions

### Files to Modify (3 files)
1. `src/App.tsx` - Add new routes
2. `src/components/layout/AppLayout.tsx` - Add nav items, include FeedbackButton
3. `src/hooks/useShipments.ts` - Add folder creation on shipment create

### Database Tables (5 new tables)
1. `staff_feedback` - Feedback submissions
2. `staff_interviews` - Interview assignments
3. `staff_interview_responses` - Individual responses
4. `testing_runs` - Test run tracking
5. `testing_results` - Individual test results
6. `folder_templates` - Template definitions

### Database Column Additions
1. `document_folders.shipment_id` - Link folders to shipments

---

## Delivery Order

1. **Database migrations** - Create all tables first
2. **Hooks** - Create all data hooks
3. **Feedback System** - Most useful during testing
4. **Testing Checklist** - For systematic validation
5. **Staff Interviews** - For process mapping
6. **Folder Templates** - Operational improvement
7. **Navigation updates** - Connect everything
