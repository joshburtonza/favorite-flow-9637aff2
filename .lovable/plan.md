

# FLAIR AI System Implementation Plan

## Overview

Transform the existing AI assistant into **FLAIR** (Favorite Logistics AI Resource) - a comprehensive, intelligent operations manager that serves as the primary interface to the entire business operations system. This involves updating the system prompts across all AI edge functions, enhancing the UI components, and adding new capabilities.

---

## What This Changes

The user has provided a comprehensive "FLAIR" system prompt specification that defines:
1. **Identity & Personality** - Professional operations manager persona for "FLAIR"
2. **Business Context** - Detailed business model, entities, and workflows
3. **Data Model Reference** - Complete schema documentation for AI context
4. **Tool Definitions** - Structured function signatures for all operations
5. **Response Formatting** - WhatsApp/Telegram vs Web interface formatting
6. **Proactive Behaviors** - Automatic alerts and anticipatory responses
7. **Conversation Patterns** - Natural language understanding examples
8. **Error Handling** - User-friendly error messages
9. **Context Injection** - Real-time system state awareness

---

## Implementation Phases

### Phase 1: Core System Prompt Updates

**Files to update:**

1. **`supabase/functions/ai-intelligence/index.ts`**
   - Replace `getSystemAwarenessPrompt()` with the full FLAIR system prompt
   - Add FLAIR identity and personality traits
   - Include complete business context (suppliers, clients, clearing agents, FX providers)
   - Add profit calculation formulas and examples
   - Include response formatting guidelines for web interface
   - Add proactive behavior triggers

2. **`supabase/functions/telegram-query/index.ts`**
   - Replace `SYSTEM_PROMPT` with FLAIR-specific Telegram/WhatsApp formatting
   - Add mobile-optimized response formatting with emojis
   - Include all tool function definitions
   - Add natural language command parsing examples

3. **`supabase/functions/analyze-document/index.ts`**
   - Update `SYSTEM_PROMPT` to use FLAIR persona
   - Enhance document classification with business context
   - Add FLAIR-style extraction rules and confidence levels

### Phase 2: Enhanced AI Chat Interface

**Files to update/create:**

1. **`src/components/ai/FloatingAIChat.tsx`**
   - Rename dialog title from "AI Assistant" to "FLAIR - Operations Manager"
   - Add FLAIR avatar/branding
   - Enhance visual styling to match FLAIR persona

2. **`src/components/ai/AIQueryChat.tsx`**
   - Update greeting message to FLAIR persona
   - Add daily briefing feature on first message
   - Update example queries to match FLAIR documentation
   - Add context summary display improvements
   - Implement proactive suggestions after responses

3. **Create `src/lib/flair-prompts.ts`** (new file)
   - Centralized FLAIR system prompts for reuse
   - Business context constants (known suppliers, clients, etc.)
   - Response formatting utilities
   - Proactive alert thresholds

### Phase 3: Proactive Intelligence Features

**Files to update:**

1. **`supabase/functions/ai-intelligence/index.ts`**
   - Add automatic alert triggers:
     - Supplier balance exceeds $50,000
     - Shipment ETA within 3 days but telex not released
     - Document submitted but no update in 5 days
     - Payment scheduled within 2 days
     - Profit margin below 10%
     - Client invoice overdue
   - Add daily briefing context generation
   - Add cash flow projection capability

2. **`src/hooks/useAIIntelligence.ts`**
   - Add `useDailyBriefing()` hook
   - Add `useProactiveAlerts()` hook
   - Add `useCashFlowProjection()` hook

### Phase 4: Enhanced Tool Capabilities

**Add to `supabase/functions/ai-intelligence/index.ts`:**

New action handlers:
- `bulk_update_status` - Update multiple shipments at once
- `bulk_create_shipments` - Create multiple shipments from list
- `report_profit_summary` - Generate profit reports with grouping
- `report_supplier_balances` - Get all outstanding balances
- `report_cash_flow` - Project cash flow for coming weeks
- `alert_send` - Send alerts to team members

### Phase 5: Context Injection Enhancement

**Update `fetchSystemContext()` in `ai-intelligence/index.ts`:**

Add comprehensive context fields:
- Recent shipments (last 100)
- Supplier balances with outstanding amounts
- Pending payments with due dates
- Recent activity (last 20 changes)
- Conversation history awareness
- Current user information

---

## Technical Details

### System Prompt Structure

The FLAIR system prompt will be organized as:

```text
# IDENTITY & ROLE
You are FLAIR (Favorite Logistics AI Resource)...

# THE BUSINESS MODEL
Company Overview, Business Flow Steps...

# KEY BUSINESS ENTITIES
Known Suppliers, Clients, Clearing Agents, FX Providers...

# DATA MODEL
Shipments schema, Costs schema, Suppliers schema...

# PROFIT CALCULATION FORMULAS
Step-by-step calculation with example...

# AVAILABLE TOOLS
Shipment operations, Supplier operations, Payment operations...

# RESPONSE FORMATTING
Web interface formatting, WhatsApp/Telegram formatting...

# PROACTIVE BEHAVIORS
Alert triggers, Daily briefing context...

# CONVERSATION PATTERNS
Natural language understanding examples...

# ERROR HANDLING
Data not found, Validation errors, Permission errors...

# CURRENT CONTEXT
Injected real-time data from database...
```

### Known Business Entities (from prompt)

**Suppliers:**
- WINTEX / WINTEX-ADNAN
- HUBEI PUFANG
- HAMZA TOWELS
- NINGBO CROSSLEAP
- AMAGGI
- COFCO

**Clients:**
- ADNAN JOOSAB
- MJ / MJ OILS
- MOTALA
- CHEVAL SHOES
- FOOT FOCUS
- FOOTWORKS
- GLOBAL

**Clearing Agents:**
- Sanjith (primary)
- Shane
- Kara
- Mojo

**FX Providers:**
- Financiere Suisse (primary)
- FNB
- Obeid

### Alert Thresholds

| Alert Type | Threshold | Priority |
|------------|-----------|----------|
| Supplier balance high | > $50,000 | Warning |
| ETA approaching, no telex | < 3 days | Urgent |
| Document stale | > 5 days no update | Warning |
| Payment due soon | < 2 days | Urgent |
| Low profit margin | < 10% | Warning |
| Overdue invoice | > payment terms | Urgent |

---

## UI Changes

### FloatingAIChat Updates
- Title: "FLAIR - Operations Manager"
- Subtitle: "Your intelligent logistics assistant"
- New icon/avatar with FLAIR branding
- Pulsing animation on urgent alerts

### AIQueryChat Updates
- Welcome message with FLAIR persona
- Daily briefing card on first interaction
- Updated example queries:
  - "What's the total profit this month?"
  - "Show me all pending shipments"
  - "What do we owe WINTEX?"
  - "Update LOT 881 status to in-transit"
- Context badges showing shipments/profit/margin
- Proactive suggestions after each response

### AIHub Updates
- FLAIR branding in header
- Activity feed shows FLAIR actions
- Document upload integrates FLAIR classification

---

## Files Changed Summary

| File | Change Type |
|------|-------------|
| `supabase/functions/ai-intelligence/index.ts` | Major update |
| `supabase/functions/telegram-query/index.ts` | Major update |
| `supabase/functions/analyze-document/index.ts` | Update |
| `src/components/ai/FloatingAIChat.tsx` | Update |
| `src/components/ai/AIQueryChat.tsx` | Update |
| `src/lib/flair-prompts.ts` | New file |
| `src/hooks/useAIIntelligence.ts` | Update |

---

## Deployment Notes

1. All edge functions need redeployment after updates
2. No database schema changes required
3. Frontend changes are immediate on save
4. Telegram bot will use updated prompts automatically

---

## Success Criteria

After implementation, FLAIR will:
- Respond with consistent persona and formatting
- Understand natural language commands like "881 got telex today"
- Proactively flag issues (high balances, overdue shipments)
- Provide daily briefings with system snapshot
- Execute database operations via conversational commands
- Format responses appropriately for web vs Telegram
- Include relevant context in every response

