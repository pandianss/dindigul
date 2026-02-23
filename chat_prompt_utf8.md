__DINDIGUL REGIONAL OFFICE PORTAL__

__AI AGENTIC BUILD PROMPT__

__Chat Intelligence Layer  ┬╖  MIS\-Aware Branch Data Collection  ┬╖  Structured Message Protocol__

__Document Type__

Agentic AI Build Prompt ΓÇö Full Implementation Specification

__Module__

ChatPanel Enhancement \+ Socket Intelligence Layer

__Target System__

Dindigul RO Portal \(React \+ Socket\.IO \+ Prisma \+ Express\)

__Prepared For__

AI Coding Agent \(Claude / GPT\-Engineer / Cursor AI\)

__Version__

v1\.0  ΓÇö  February 2026

__Roles Covered__

ADMIN ┬╖ RO ┬╖ BRANCH ┬╖ GUEST

# __1\.  Purpose & Agentic Context__

You are an expert full\-stack TypeScript developer and system architect\. Your task is to enhance the Chat subsystem of the Dindigul Regional Office Portal ΓÇö a banking operations portal used by the Regional Office \(RO\) and its subordinate branches ΓÇö so that it becomes an intelligent, MIS\-aware data collection and dissemination channel rather than a generic messaging tool\.

Read every section of this prompt before writing a single line of code\. The instructions are layered and interdependent\. Failure to read ahead will result in redundant work\.

__CRITICAL CONTEXT ΓÇö READ BEFORE BUILDING__

__The MIS data flow is strictly top\-down:__

- The RO Admin uploads a consolidated CSV via MISUpload\.tsx ΓåÆ POST /api/mis/upload
- The backend parses the CSV row\-by\-row \(Branch\_Code ├ù Parameter\_Code ├ù Date ├ù Actual\_Value\)
- Each branch's data slice is stored in the database and is visible only to that branch's users
- Branch users never upload MIS data ΓÇö they receive it after the RO uploads

The chat layer must NOT attempt to replicate MIS upload functionality\. Its role is to sit on top of the MIS pipeline as a feedback, query, and alert channel ΓÇö handling what CSV uploads cannot: explanations, confirmations, targeted queries, and real\-time status notifications\.

# __2\.  Current State Audit__

## __2\.1  What Exists Today__

__File / Component__

__Current Capability__

src/ui/chat/ChatPanel\.tsx

4 hardcoded group rooms, plain text send/receive, no timestamps rendered

src/context/SocketContext\.tsx

Socket\.IO connect/disconnect, receive\_message, chat\_history, join\_room events

src/services/api\.ts

Axios instance with JWT auth interceptor, baseURL from env

src/context/AuthContext\.tsx

Role enum: ADMIN | RO | BRANCH | GUEST, branchId on user object

src/modules/admin/MISUpload\.tsx

CSV upload ΓåÆ POST /api/mis/upload, date parameter, success/error state

branches\.csv

SOL code, branch name, district, category, lat/lng ΓÇö 40\+ branches

Message interface

\{ user: string, text: string, timestamp: string \} ΓÇö no type or payload fields

## __2\.2  Critical Gaps__

- Message interface cannot carry structured data ΓÇö only plain text
- No role\-based room access control ΓÇö any user can join any room
- No unread badge / notification when panel is closed
- Timestamps exist in data but are never rendered in the UI
- MIS upload backend emits no socket events after processing ΓÇö chat has no awareness of new data
- No mechanism for RO to push a query card to a specific branch's chat room
- No mechanism for branch to submit a structured response back to RO
- Emergency room has no special behaviour, sound, or escalation path

# __3\.  Target Architecture__

The enhanced chat system has three logical layers:

__Layer__

__Responsibility__

Layer 1 ΓÇö Transport

Socket\.IO rooms, JWT\-authenticated connections, role\-validated room joins \(existing, extend\)

Layer 2 ΓÇö Message Protocol

Extended Message type with type \+ payload fields; typed socket events for each message kind

Layer 3 ΓÇö Intelligence

MIS post\-upload hooks, slash\-command resolver, automated alert emission, query/response lifecycle

## __3\.1  Extended Message Type__

Replace the existing Message interface across all files with the following\. This is the single most important structural change ΓÇö everything else depends on it\.

// src/types/chat\.ts  \(new file ΓÇö canonical type definitions\)

export type MessageType =

  | 'text'           // ordinary user message

  | 'mis\_alert'      // system: status change after MIS upload

  | 'mis\_snapshot'   // response to /snapshot query

  | 'ro\_query'       // RO asking branch a structured question

  | 'branch\_response'// branch replying to an ro\_query

  | 'system\_info'    // non\-critical system notification

  | 'emergency';     // critical alert requiring acknowledgement

export interface ChatMessage \{

  id:          string;         // uuid ΓÇö generated server\-side

  type:        MessageType;

  room:        string;         // socket room id

  user:        string;         // sender display name

  role:        string;         // sender role: ADMIN | RO | BRANCH

  branchCode?: string;         // SOL code of sender's branch \(BRANCH role only\)

  text:        string;         // always present ΓÇö summary / fallback text

  payload?:    Record<string, any>; // structured data \(type\-specific\)

  timestamp:   string;         // ISO 8601

  readBy?:     string\[\];       // list of user names who have read

\}

## __3\.2  Room Architecture__

__Room ID__

__Access Control__

__Purpose__

global

All authenticated roles

General operational coordination

it\_support

All authenticated roles

Technical assistance ΓÇö branch logs IT issues

management

ADMIN and RO only

Branch\-head channel ΓÇö RO sends queries, receives responses

emergency

All roles \(read\); ADMIN/RO \(write\)

Critical alerts ΓÇö branches receive, RO/Admin send

branch:\{sol\}

BRANCH matching SOL, ADMIN, RO

Private per\-branch channel for MIS alerts and RO queries

*Note: branch:\{sol\} rooms \(e\.g\. branch:0332\) are created dynamically\. The backend must validate that a BRANCH user's branchCode matches the SOL in the room ID before allowing join\.*

# __4\.  Implementation Phases__

Phase

__1__

__Extended Message Protocol & Type Safety__

Backend \+ Frontend  ┬╖  Est\. 2ΓÇô3 hrs

This phase has zero visible UI changes but is the foundation of all subsequent phases\. Do not skip or defer it\.

__Backend Tasks__

1. __Create src/types/chat\.ts__

Export ChatMessage and MessageType as defined in ┬º3\.1 above\.

1. __Update Socket\.IO server message schema__

All emit\('receive\_message', \.\.\.\) calls must now emit a full ChatMessage object\. Generate a uuid for each message id server\-side using the uuid npm package\.

1. __Add room access validation on join\_room event__

On the server, when a socket emits join\_room, validate role and branchCode against the room id using the rules in ┬º3\.2\. Reject with an error event if unauthorised\.

1. __Persist messages to database__

Create a ChatMessage Prisma model with all fields in ┬º3\.1\. Persist every received message\. Return last 50 messages on chat\_history\.

__Frontend Tasks__

1. __Update SocketContext\.tsx__

Replace the local Message interface import with ChatMessage from src/types/chat\.ts\. The messages state is now ChatMessage\[\]\.

1. __Update ChatPanel\.tsx message rendering__

Add a renderMessage\(m: ChatMessage\) switch on m\.type\. For type 'text' render the existing bubble\. All other types render a placeholder card with the type label and raw JSON payload \(will be styled in Phase 3\)\.

Phase

__2__

__MIS Post\-Upload Intelligence Hook__

Backend only  ┬╖  Est\. 2ΓÇô3 hrs

After the RO Admin uploads MIS data and the backend processes it, the system must automatically emit socket events that inform relevant chat rooms of the updated status\. This creates the automated feed described in the architectural vision\.

__Backend ΓÇö POST /api/mis/upload post\-processing hook__

After the existing CSV ingestion and snapshot recalculation completes, add the following emission logic:

// After snapshot recalculation for each branch:

for \(const branch of updatedBranches\) \{

  for \(const param of branch\.parameters\) \{

    if \(param\.statusChanged && param\.newStatus === 'NEGATIVE'\) \{

      // 1\. Emit to management room \(RO sees it\)

      io\.to\('management'\)\.emit\('receive\_message', \{

        id: uuidv4\(\),

        type: 'mis\_alert',

        room: 'management',

        user: 'System',

        role: 'ADMIN',

        text: \`$\{branch\.name\} \($\{branch\.sol\}\) ΓÇö $\{param\.name\} moved to NEGATIVE\`,

        payload: \{

          branchCode:   branch\.sol,

          branchName:   branch\.name,

          paramCode:    param\.code,

          paramName:    param\.name,

          prevStatus:   param\.prevStatus,

          newStatus:    param\.newStatus,

          paceIndicator:param\.paceIndicator,

          currentActual:param\.currentActual,

          proRatedBudget: param\.proRatedBudget,

          snapshotDate: date,

        \},

        timestamp: new Date\(\)\.toISOString\(\),

      \} as ChatMessage\);

      // 2\. Also emit to the branch's private room

      io\.to\(\`branch:$\{branch\.sol\}\`\)\.emit\('receive\_message', \{

        \.\.\.samePayload,

        room: \`branch:$\{branch\.sol\}\`,

      \} as ChatMessage\);

    \}

  \}

  // 3\. Emit a summary card to the management room regardless of status change

  io\.to\('management'\)\.emit\('receive\_message', \{

    id: uuidv4\(\),

    type: 'system\_info',

    room: 'management',

    user: 'System',

    role: 'ADMIN',

    text: \`MIS updated for $\{branch\.name\} ΓÇö $\{date\}\`,

    payload: \{ branchCode: branch\.sol, date, paramCount: branch\.parameters\.length \},

    timestamp: new Date\(\)\.toISOString\(\),

  \} as ChatMessage\);

\}

The status change detection logic should compare the newly computed status badge \(SURPASSED / POSITIVE / LAGGING / NEGATIVE\) for each parameter against the last stored status for the same branch \+ parameter \+ previous upload date\.

Phase

__3__

__Structured Message Card Rendering__

Frontend only  ┬╖  Est\. 3ΓÇô4 hrs

Replace the placeholder card from Phase 1 with properly designed card components for each message type\. All cards are rendered inside ChatPanel\.tsx via the renderMessage\(\) switch\.

__Card Specifications by Message Type__

__Message Type__

__Visual Design__

__Key Payload Fields Displayed__

mis\_alert

Red left border, warning icon, branch name bold, parameter name, oldΓåÆnew status badges, pace % with colour

branchName, branchCode, paramName, prevStatus, newStatus, paceIndicator, currentActual

mis\_snapshot

Teal left border, table layout: parameter | actual | budget | pace | status badge

branchName, date, rows: \[\{paramName, actual, budget, paceIndicator, status\}\]

ro\_query

Gold left border, question icon, query text prominent, deadline if set, 'Submit Response' button visible to BRANCH users only

queryText, queryId, deadline, requestedBy, paramCodes \(optional\)

branch\_response

Green left border, branch name, response text, timestamp, linked to queryId

queryId, branchCode, branchName, responseText, respondedAt

emergency

Full red background, siren icon, bold white text, 'Acknowledge' button, sound plays on receipt

alertText, severity, issuedBy, acknowledgedBy\[\]

system\_info

Light grey, italic small text, system icon ΓÇö unobtrusive

text only

__Unread Badge__

Add an unreadCount: number field to the SocketContext\. Increment it whenever a receive\_message event fires and the panel is closed \(open === false\)\. Reset to 0 when the panel is opened\. Expose unreadCount from useSocket\(\)\. The chat toggle button in the Header / LayoutShell renders a red badge with this count when > 0\.

__Timestamp Display__

Every message bubble and card must display the timestamp field\. Format using date\-fns: format\(parseISO\(m\.timestamp\), 'dd MMM, hh:mm a'\)\. Show it in a small muted style below the message body\.

Phase

__4__

__Slash\-Command & Quick\-Query Interface__

Frontend \+ Backend  ┬╖  Est\. 2ΓÇô3 hrs

RO users need to be able to query branch data on demand without navigating away from chat\. This phase implements the slash\-command resolver and the quick\-query button tray\.

__Slash Commands ΓÇö Supported Set__

__Command__

__Who Can Use__

__Backend Call__

__Response Type__

/snapshot \{SOL\}

RO, ADMIN

GET /api/mis/snapshot?branchCode=\{SOL\}&date=today

mis\_snapshot card

/snapshot \{SOL\} \{date\}

RO, ADMIN

GET /api/mis/snapshot?branchCode=\{SOL\}&date=\{date\}

mis\_snapshot card

/pending \{SOL\}

RO, ADMIN

GET /api/requests?branchCode=\{SOL\}&status=OPEN

system\_info card listing open requests

/ask \{SOL\} \{question\}

RO, ADMIN

Emits ro\_query to branch:\{SOL\} room

ro\_query card in branch room

/branches

RO, ADMIN

GET /api/branches \(list from branches\.csv\)

system\_info card with branch list

/mydata

BRANCH

GET /api/mis/snapshot?branchCode=\{user\.branchCode\}&date=today

mis\_snapshot card

__Frontend Implementation__

In ChatPanel\.tsx, intercept the send action \(both Enter key and Send button\)\. If text\.trim\(\)\.startsWith\('/'\), call handleSlashCommand\(text\) instead of sendMessage\(\)\. Do not emit the raw text to the socket ΓÇö resolve the command locally and call the appropriate API endpoint, then inject the response as a synthetic ChatMessage into the local messages array \(or receive it from the server as a socket response\)\.

__Quick\-Query Button Tray \(RO View Only\)__

Below the room list \(when no room is selected\), add a 'Quick Queries' section visible only to RO and ADMIN roles\. Render a horizontal scroll row of pill buttons: one per active branch, clicking a branch opens a sub\-menu with: Today's Snapshot ┬╖ Open Requests ┬╖ Send Query\. These invoke the corresponding slash commands without requiring the user to type\.

Phase

__5__

__RO Query & Branch Response Lifecycle__

Frontend \+ Backend  ┬╖  Est\. 3ΓÇô4 hrs

This is the most operationally significant phase\. It creates the structured feedback loop between the RO and branches ΓÇö the mechanism for branches to provide qualitative context alongside quantitative MIS data\.

__RO Query Flow__

1. __RO types /ask 0332 Why did deposits drop yesterday?__
2. __Backend creates a BranchQuery record in the database: \{ id, branchCode, queryText, askedBy, askedAt, status: PENDING \}__
3. __Backend emits ro\_query ChatMessage to room branch:0332 with queryId__
4. __Branch user sees the ro\_query card in their chat panel with a 'Submit Response' button__
5. __Branch types their response in a text area within the card and submits__
6. __Backend updates BranchQuery to \{ response, respondedBy, respondedAt, status: ANSWERED \}__
7. __Backend emits branch\_response ChatMessage to management room, linking back to queryId__
8. __RO sees the branch\_response card in the management room, with the original query context visible__

__Database Schema Addition__

// Add to schema\.prisma

model BranchQuery \{

  id           String   @id @default\(uuid\(\)\)

  branchCode   String

  queryText    String

  askedBy      String

  askedAt      DateTime @default\(now\(\)\)

  deadline     DateTime?

  paramCodes   String\[\] // optional ΓÇö links query to specific MIS parameters

  status       QueryStatus @default\(PENDING\)

  response     String?

  respondedBy  String?

  respondedAt  DateTime?

  relatedMisDate DateTime?

\}

enum QueryStatus \{

  PENDING

  ANSWERED

  ACKNOWLEDGED

  ESCALATED

\}

Phase

__6__

__Emergency Room & Notification System__

Frontend \+ Backend  ┬╖  Est\. 1ΓÇô2 hrs

__Emergency Room Behaviour__

- Only ADMIN and RO roles may send messages to the emergency room
- On receipt of an emergency ChatMessage, play a short audio alert using the Web Audio API \(generate a 440Hz beep, 500ms ΓÇö do not use an external audio file\)
- The emergency card renders full\-width with a red background as specified in Phase 3
- Add an Acknowledge button that emits an acknowledge\_emergency socket event with the message id and user name
- The backend updates the readBy\[\] array in the stored ChatMessage
- The card re\-renders to show the list of acknowledgers in small text below the alert

__Notification Badge ΓÇö Implementation Detail__

// In SocketContext\.tsx

const \[unreadCount, setUnreadCount\] = useState\(0\);

const \[isPanelOpen, setIsPanelOpen\] = useState\(false\);

function onMessage\(message: ChatMessage\) \{

  setMessages\(prev => \[\.\.\.prev, message\]\);

  if \(\!isPanelOpen\) \{

    setUnreadCount\(prev => prev \+ 1\);

  \}

\}

// Export isPanelOpen setter as openPanel / closePanel

// Call openPanel\(\) in ChatPanel when open prop becomes true

// Call closePanel\(\) and setUnreadCount\(0\) simultaneously

# __5\.  New API Endpoints Required__

__Method \+ Path__

__Auth__

__Description__

__Response__

GET /api/mis/snapshot

JWT ΓÇö RO/ADMIN sees any branch; BRANCH sees own only

Returns latest MIS snapshot for branchCode \+ date \(defaults today\)\. Used by /snapshot command\.

\{ branchCode, branchName, date, rows: \[\{paramCode, paramName, actual, budget, paceIndicator, status\}\] \}

GET /api/branches

JWT ΓÇö all roles

Returns list of active branches from the branch master\. Used by /branches command and quick\-query tray\.

\{ branches: \[\{sol, name, district, category\}\] \}

POST /api/chat/query

JWT ΓÇö RO/ADMIN only

Creates a BranchQuery record and emits ro\_query socket event to the target branch room\.

\{ queryId, status: 'PENDING' \}

POST /api/chat/respond

JWT ΓÇö BRANCH only

Submits a response to a BranchQuery\. Updates record and emits branch\_response to management room\.

\{ queryId, status: 'ANSWERED' \}

GET /api/chat/history/:room

JWT ΓÇö role \+ room access validated

Returns last 50 ChatMessage records for the room from the database\.

\{ messages: ChatMessage\[\] \}

# __6\.  Constraints & Non\-Negotiables__

__Constraint__

__Detail__

Data isolation

A BRANCH user must never see MIS data or query cards belonging to another branch\. Enforce at both the socket room level AND the API query level using branchCode from the JWT payload\.

MIS upload unchanged

Do not modify MISUpload\.tsx or the POST /api/mis/upload request structure\. The hook is server\-side only ΓÇö add a post\-processing function called after the existing CSV ingestion completes\.

No localStorage in renders

Remove the JSON\.parse\(localStorage\.getItem\('user'\)\) call from inside the message render loop\. Read user once at the SocketContext level from useAuth\(\) and pass it down\.

Type safety

No any types on ChatMessage payload in component code\. Define a typed payload interface for each MessageType in src/types/chat\.ts and use type guards in renderMessage\(\)\.

Backward compatibility

The existing plain text sendMessage\(\) path must continue to work unchanged\. Slash\-command interception is additive, not a replacement\.

No external audio files

Emergency sound must use Web Audio API synthesis ΓÇö no \.mp3 / \.wav files required\.

i18n neutral

All new UI strings must use the existing i18n system \(react\-i18next\)\. Add keys to en\.json, ta\.json, hi\.json\. Do not hardcode English strings in JSX\.

# __7\.  Acceptance Criteria__

The implementation is complete when all of the following are verifiable in the running application:

__\#__

__Acceptance Test__

__Pass Condition__

AC\-01

Role\-based room access

A BRANCH user attempting to join the management room receives an unauthorised error and the UI shows a toast notification

AC\-02

MIS alert on upload

After RO uploads a CSV that changes a branch to NEGATIVE status, a mis\_alert card appears in the management room within 5 seconds without any page refresh

AC\-03

Branch sees own alert

The same NEGATIVE status change triggers a mis\_alert card in the branch:\{sol\} room visible to the affected branch's logged\-in user

AC\-04

Snapshot slash command

RO types /snapshot 0332 in management room and receives a mis\_snapshot card with tabular data within 3 seconds

AC\-05

Branch mydata command

A BRANCH user types /mydata and receives their own mis\_snapshot card ΓÇö not another branch's data

AC\-06

RO query lifecycle

RO sends /ask 0332 question, branch sees ro\_query card, branch submits response, RO sees branch\_response card linked to original query

AC\-07

Emergency sound

A message sent to the emergency room triggers an audio beep on all connected clients who have the panel closed

AC\-08

Unread badge

When chat panel is closed and a message arrives in any joined room, the chat toggle button shows a numeric red badge

AC\-09

Timestamps visible

Every message bubble and card shows a formatted timestamp \(e\.g\. 22 Feb, 09:45 AM\)

AC\-10

Message persistence

Closing and reopening the chat panel restores the last 50 messages from the database ΓÇö not just session memory

# __8\.  Delivery & Handoff__

## __8\.1  Files to Create or Modify__

__File__

__Action__

__Summary of Change__

src/types/chat\.ts

CREATE

ChatMessage interface, MessageType union, payload interfaces per type

src/ui/chat/ChatPanel\.tsx

MODIFY

renderMessage\(\) switch, slash\-command interception, unread reset, timestamp display, quick\-query tray

src/context/SocketContext\.tsx

MODIFY

Use ChatMessage\[\], add unreadCount, openPanel/closePanel, remove localStorage from render

src/services/socket\.ts

MODIFY

Add typed event listeners for acknowledge\_emergency

prisma/schema\.prisma

MODIFY

Add ChatMessage model, BranchQuery model, QueryStatus enum

server/socket/chatHandler\.ts

CREATE

join\_room validation, receive\_message persistence, ro\_query and branch\_response lifecycle

server/routes/mis\.ts

MODIFY

Add GET /api/mis/snapshot endpoint; add post\-upload hook calling chatHandler\.emitMisAlerts\(\)

server/routes/chat\.ts

CREATE

POST /api/chat/query, POST /api/chat/respond, GET /api/chat/history/:room

src/i18n/locales/en\.json

MODIFY

Add all new UI string keys

src/i18n/locales/ta\.json

MODIFY

Tamil translations for new keys

src/i18n/locales/hi\.json

MODIFY

Hindi translations for new keys

## __8\.2  Order of Implementation__

Strictly follow this order to avoid rework:

- Phase 1 ΓÇö Types and schema \(no visible UI change, but everything depends on it\)
- Phase 2 ΓÇö Backend MIS hook \(testable via Postman / socket client before UI work\)
- Phase 3 ΓÇö Card rendering and unread badge \(visible payoff, builds user confidence\)
- Phase 4 ΓÇö Slash commands and quick\-query tray \(self\-contained feature\)
- Phase 5 ΓÇö RO query / branch response lifecycle \(depends on Phase 3 card types\)
- Phase 6 ΓÇö Emergency room and notification system \(isolated, low\-risk last\)

__END OF AGENTIC BUILD PROMPT  ┬╖  Dindigul RO Portal  ┬╖  Chat Intelligence Layer  ┬╖  v1\.0  ┬╖  Feb 2026__

