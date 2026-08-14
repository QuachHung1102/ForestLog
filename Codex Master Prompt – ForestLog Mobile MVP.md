# ForestLog – Offline Patrol Reporting Tool
## Master Implementation Prompt for Codex

You are working as a senior mobile engineer on a project called **ForestLog**.

Your task is to design and implement the **MVP mobile application** for ForestLog.

ForestLog is an **offline-first forest patrol reporting application** designed for forest rangers and forest protection staff operating in remote areas where internet connectivity may be weak or completely unavailable.

The application is NOT primarily a mapping application.

The core purpose is:

> Allow a ranger to create a patrol session, record field events with photos and GPS coordinates, complete the patrol, and automatically generate a structured report without needing to re-enter information on a computer.

---

# 1. Working Rules

Before modifying any code:

1. Inspect the entire repository structure.
2. Read:
   - `package.json`
   - TypeScript configuration
   - Expo / React Native configuration
   - navigation setup
   - existing screens
   - existing components
   - existing state management
   - existing database/storage implementation
3. Reuse the current project architecture where reasonable.
4. Do NOT rewrite the entire project if an existing implementation already exists.
5. Do NOT introduce unnecessary libraries.
6. Before installing a dependency, check whether an equivalent dependency already exists.
7. Prefer libraries compatible with the project's existing Expo/React Native version.
8. Keep TypeScript strict and avoid `any` unless absolutely necessary.
9. Separate UI, business logic, persistence, and device APIs.
10. The app must remain functional without an internet connection.

If the repository differs from the architecture described below, adapt the implementation to the existing project instead of blindly replacing it.

---

# 2. Product Overview

Application name:

**ForestLog**

Full concept:

**ForestLog – Offline Patrol Reporting Tool**

Primary users:

- Forest rangers
- Forest protection staff
- Patrol teams
- Forest management stations

Primary operating environment:

- Forest
- Mountainous areas
- Remote locations
- Weak or unavailable mobile network
- Android phones are the main target device

The UI should therefore be:

- simple
- readable outdoors
- touch-friendly
- low cognitive load
- usable by non-technical users
- resistant to accidental data loss

Do not over-engineer the visual design.

Functionality and reliability are more important than visual effects.

---

# 3. Technical Direction

Preferred stack if compatible with the existing project:

- React Native
- Expo
- TypeScript
- Expo Router or existing navigation solution
- SQLite for structured offline data
- Device filesystem for local media
- Expo Camera / Image Picker
- Expo Location
- Expo FileSystem
- Expo Sharing
- PDF generation using a compatible Expo solution

Use existing equivalents if the repository already uses another library.

The architecture must be **offline-first**.

Internet access must NOT be required for:

- creating patrols
- viewing patrols
- recording events
- taking photos
- saving GPS coordinates
- completing patrols
- viewing historical patrols
- generating reports

Do not implement a backend for the MVP unless one already exists in the repository.

---

# 4. Core Domain Model

The application revolves around four primary concepts:

1. Patrol
2. Patrol Event
3. Forestry Area
4. Report

---

# 5. Forestry Administrative Structure

Forest areas should NOT initially depend on maps.

Use the forestry administrative hierarchy:

**Tiểu khu → Khoảnh → Lô**

Suggested model:

```ts
interface ForestArea {
  id: string;
  subZone: string; // Tiểu khu
  compartment: string; // Khoảnh
  plot: string; // Lô
}
```

Example:

```ts
{
  id: "TK12-K3-L7",
  subZone: "12",
  compartment: "3",
  plot: "7"
}
```

For MVP, forest areas may come from:

- seeded local data
- JSON configuration
- SQLite seed table

Do not require API access.

Design this layer so that areas could later be synchronized from a backend.

---

# 6. Patrol Model

A patrol represents one forest patrol trip.

Suggested TypeScript model:

```ts
type PatrolStatus = "draft" | "active" | "completed";

interface Patrol {
  id: string;

  rangerName: string;

  startedAt: string;
  completedAt?: string;

  forestAreaId: string;

  weather?: WeatherType;

  estimatedDistanceKm?: number;

  emergencyReportRequired?: boolean;

  status: PatrolStatus;

  createdAt: string;
  updatedAt: string;
}
```

Possible weather values:

```ts
type WeatherType =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "foggy"
  | "other";
```

Display Vietnamese labels in UI:

- Nắng
- Nhiều mây
- Mưa
- Sương mù
- Khác

Do not store translated UI labels directly if enums are more appropriate.

---

# 7. Patrol Event Model

A Patrol Event represents one observation made during a patrol.

Suggested model:

```ts
type PatrolEventType =
  | "illegal_logging"
  | "illegal_hunting"
  | "fire_risk"
  | "land_encroachment"
  | "waste"
  | "no_violation";

type SeverityLevel =
  | "low"
  | "medium"
  | "high";

interface PatrolEvent {
  id: string;

  patrolId: string;

  type: PatrolEventType;

  severity: SeverityLevel;

  note?: string;

  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;

  occurredAt: string;

  createdAt: string;
  updatedAt: string;
}
```

UI labels:

```text
illegal_logging
→ Chặt phá rừng

illegal_hunting
→ Bẫy / săn bắt trái phép

fire_risk
→ Cháy / nguy cơ cháy

land_encroachment
→ Xâm lấn đất

waste
→ Rác thải

no_violation
→ Không phát hiện vi phạm
```

Severity:

```text
low
→ Thấp

medium
→ Trung bình

high
→ Cao
```

---

# 8. Event Photos

Each patrol event may contain one or multiple photos.

Prefer supporting multiple photos in the data architecture even if MVP UI initially limits the number.

Suggested model:

```ts
interface EventPhoto {
  id: string;

  eventId: string;

  localUri: string;

  createdAt: string;
}
```

Photos must work completely offline.

Do NOT store binary images in SQLite.

Store:

- metadata in SQLite
- image file in app filesystem

Ensure file references remain valid after the app restarts.

If camera capture generates temporary files, copy/move them to an application-controlled persistent directory.

Example directory concept:

```text
ForestLog/
  media/
    patrols/
      {patrolId}/
        events/
          {eventId}/
            photo-001.jpg
```

Actual implementation should respect Expo filesystem APIs and platform requirements.

---

# 9. GPS Behavior

ForestLog does NOT display a map in MVP.

GPS is used only to capture numerical coordinates.

When creating an event:

1. Request location permission if required.
2. Attempt to capture current location.
3. Save:
   - latitude
   - longitude
   - accuracy if available
4. Do not block the entire event creation flow if GPS cannot be acquired.
5. Show the user a simple status such as:

```text
Đã lấy tọa độ GPS
```

or:

```text
Không thể lấy tọa độ
```

Coordinates may optionally be shown as plain text in event details:

```text
21.028511, 105.804817
```

Never require internet for GPS.

Do not implement Google Maps, Mapbox, OpenStreetMap map rendering, or geocoding in MVP.

---

# 10. Core Application Flow

The MVP has four primary stages.

---

## Stage 1 – Create Patrol

User taps:

**Bắt đầu chuyến tuần tra**

Create Patrol screen contains:

### Người đi tuần

Required text input:

```text
Tên người đi tuần
```

Later this may come from authenticated user information, but MVP may use text input or saved local profile.

### Khu vực

Select:

```text
Tiểu khu
Khoảnh
Lô
```

Prefer dependent selection:

```text
Tiểu khu
↓
Khoảnh belonging to selected Tiểu khu
↓
Lô belonging to selected Khoảnh
```

### Date and Time

Automatically generated.

Display it, but user should normally not need to manually enter it.

### Weather

Optional selector:

```text
Nắng
Nhiều mây
Mưa
Sương mù
Khác
```

Primary action:

**Bắt đầu tuần tra**

After saving:

- create patrol record
- set status = `active`
- navigate to active patrol screen

---

# 11. Active Patrol Screen

This is the most important screen in the application.

Display:

- Ranger name
- Start time
- Tiểu khu / Khoảnh / Lô
- Weather
- Number of recorded events

Example:

```text
Chuyến tuần tra đang diễn ra

Người đi tuần:
Nguyễn Văn A

Khu vực:
Tiểu khu 12 · Khoảnh 3 · Lô 7

Bắt đầu:
08:35 · 14/08/2026

Sự kiện đã ghi nhận:
3
```

Main button:

**+ Ghi nhận sự kiện**

This button must be large and easy to tap.

Below it, display event cards in chronological order.

Example:

```text
Chặt phá rừng
Mức độ: Cao

09:12

1 ảnh
Có GPS
```

User can tap an event to inspect/edit it.

At bottom:

**Kết thúc chuyến tuần tra**

Require confirmation before ending the patrol.

---

# 12. Record Event Flow

When user taps:

**+ Ghi nhận sự kiện**

Open the Event Form.

The form should be optimized for speed.

---

## Event Type

Required.

Use large selectable cards, buttons, radio list, or bottom-sheet selection.

Options:

- Chặt phá rừng
- Bẫy / săn bắt trái phép
- Cháy / nguy cơ cháy
- Xâm lấn đất
- Rác thải
- Không phát hiện vi phạm

Prefer visual selection rather than requiring typed input.

---

## Severity

Required unless product logic explicitly treats `no_violation` differently.

Options:

- Thấp
- Trung bình
- Cao

Use clear visual differentiation.

Do NOT rely solely on color to represent severity.

Always show text labels.

---

## Photos

Allow:

**Chụp ảnh**

and optionally:

**Chọn từ thư viện**

Camera is more important than photo library.

After capturing:

show thumbnail preview.

Allow user to:

- add another photo
- remove a photo before saving
- view photo

Photos must be persisted locally.

---

## Notes

Optional multiline text input.

Label:

**Ghi chú**

Placeholder:

```text
Mô tả ngắn tình trạng tại hiện trường...
```

Do not force long descriptions.

---

# 13. Automatic GPS Capture

When Event Form opens, start attempting to capture the current GPS location.

Display state clearly:

```text
Đang lấy tọa độ...
```

then either:

```text
Đã lấy tọa độ
```

or:

```text
Không thể lấy tọa độ
```

Provide:

**Thử lại**

if GPS failed.

Do not require GPS success to save an event.

---

# 14. Event Save Behavior

When user presses:

**Lưu ghi nhận**

Validate:

- event type exists
- severity exists when required

Then:

1. Persist event locally.
2. Persist photos.
3. Persist GPS data if available.
4. Associate event with current patrol.
5. Return to active patrol screen.
6. Immediately update event count.

Do not rely solely on temporary React state.

Data must survive app restart.

---

# 15. Event Editing

User should be able to open an existing event before patrol completion.

Event detail should support:

- view event type
- view severity
- view notes
- view coordinates
- view photos
- edit event
- delete event

Deleting an event must require confirmation.

If event is deleted:

- delete event database row
- delete associated EventPhoto records
- remove corresponding image files when safe

Avoid orphan files.

---

# 16. Complete Patrol Flow

When user taps:

**Kết thúc chuyến tuần tra**

show a completion form.

Fields:

### Tổng quãng đường

Numeric input.

Label:

```text
Tổng quãng đường đi bộ
```

Unit:

```text
km
```

This value is manually estimated for MVP.

Do NOT implement automatic route tracking.

---

### Number of Events

Automatically calculate.

Example:

```text
Số sự kiện ghi nhận

5
```

User should not edit this value.

---

### Emergency Report

Question:

```text
Có cần báo cáo khẩn không?
```

Options:

```text
Có
Không
```

Use a clear binary selection.

---

# 17. Complete Patrol Confirmation

Show summary before final completion.

Example:

```text
Xác nhận kết thúc chuyến tuần tra

Khu vực
Tiểu khu 12 · Khoảnh 3 · Lô 7

Số sự kiện
5

Quãng đường
6.5 km

Báo cáo khẩn
Có
```

Action:

**Hoàn thành chuyến tuần tra**

After confirmation:

```ts
status = "completed"
completedAt = currentTimestamp
```

Completed patrols must remain available in local history.

---

# 18. Patrol History

Create a screen:

**Lịch sử tuần tra**

Display completed patrols.

Each card should contain:

- Date
- Ranger
- Forestry area
- Event count
- Emergency status

Example:

```text
14/08/2026

Nguyễn Văn A

Tiểu khu 12 · Khoảnh 3 · Lô 7

5 sự kiện

⚠ Cần báo cáo khẩn
```

Sort newest first.

Allow tapping to open Patrol Detail.

---

# 19. Patrol Detail

Show:

- Patrol metadata
- Start/end time
- Ranger
- Area
- Weather
- Distance
- Emergency status
- Event count
- Event list

Provide report action:

**Xuất báo cáo**

Completed patrols should normally be treated as read-only.

Avoid accidental editing of finalized patrol reports.

---

# 20. Report Generation

One of ForestLog's key features is generating a report automatically.

User should NOT have to manually rewrite patrol information.

Support at minimum:

**PDF**

Design architecture so DOCX export can later be added.

Do not compromise MVP stability merely to support Word if reliable DOCX generation is difficult in the current stack.

PDF is higher priority.

---

# 21. PDF Report Structure

Generate a professional but compact report.

Suggested report structure:

```text
BÁO CÁO TUẦN TRA RỪNG
```

## I. Thông tin chuyến tuần tra

```text
Người đi tuần:
Nguyễn Văn A

Thời gian bắt đầu:
08:35 - 14/08/2026

Thời gian kết thúc:
13:45 - 14/08/2026

Khu vực:
Tiểu khu 12
Khoảnh 3
Lô 7

Thời tiết:
Nhiều mây

Tổng quãng đường:
6.5 km

Số sự kiện ghi nhận:
5

Báo cáo khẩn:
Có
```

## II. Danh sách ghi nhận

For each event:

```text
Sự kiện 01

Loại:
Chặt phá rừng

Mức độ:
Cao

Thời gian:
09:12 - 14/08/2026

Tọa độ:
21.028511, 105.804817

Ghi chú:
Phát hiện nhiều cây mới bị cưa hạ.
```

Include associated images.

Repeat for each event.

---

# 22. Report Sharing

After PDF generation:

display:

**Báo cáo đã được tạo**

Actions:

- Xem báo cáo
- Chia sẻ
- Đóng

Use the native device sharing mechanism.

The sharing flow should make it possible for users to choose apps such as:

- Zalo
- Email
- Google Drive
- messaging applications

Do not build separate Zalo or email integration in MVP.

Use the OS native share sheet.

---

# 23. Home Screen

Design a simple home screen.

Suggested layout:

```text
ForestLog

Ghi nhận tuần tra rừng
Offline
```

Main action:

**Bắt đầu chuyến tuần tra**

Secondary sections:

**Chuyến đang thực hiện**

Only show if active patrol exists.

**Lịch sử tuần tra**

Optional small status:

```text
Dữ liệu được lưu trên thiết bị
```

Avoid clutter.

---

# 24. Active Patrol Recovery

This is important.

If the user:

- closes the app
- kills the process
- restarts the phone
- accidentally leaves the screen

an active patrol must not disappear.

When the app starts:

query local database for active patrol.

If one exists:

show:

```text
Bạn có một chuyến tuần tra đang diễn ra.
```

and provide:

**Tiếp tục tuần tra**

Do not automatically create another patrol.

For MVP, ideally allow only one active patrol at a time.

---

# 25. Database Design

Prefer a relational schema.

Suggested tables:

```text
forest_areas

patrols

patrol_events

event_photos
```

Relationships:

```text
forest_areas
    1
    |
    N
patrols
    1
    |
    N
patrol_events
    1
    |
    N
event_photos
```

Suggested SQLite schema concept:

```sql
CREATE TABLE forest_areas (
  id TEXT PRIMARY KEY,
  sub_zone TEXT NOT NULL,
  compartment TEXT NOT NULL,
  plot TEXT NOT NULL
);

CREATE TABLE patrols (
  id TEXT PRIMARY KEY,
  ranger_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  forest_area_id TEXT NOT NULL,
  weather TEXT,
  estimated_distance_km REAL,
  emergency_report_required INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE patrol_events (
  id TEXT PRIMARY KEY,
  patrol_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  note TEXT,
  latitude REAL,
  longitude REAL,
  gps_accuracy REAL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE event_photos (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

Adapt syntax to the actual SQLite library.

Use database migrations or a schema version mechanism if possible.

Do not silently destroy existing user data when schema changes.

---

# 26. Repository Layer

Do not spread raw SQLite calls across UI screens.

Create repository/service abstractions.

Example conceptual structure:

```text
data/
  database/
    database.ts
    migrations.ts

  repositories/
    patrolRepository.ts
    eventRepository.ts
    forestAreaRepository.ts
```

Possible API:

```ts
createPatrol()

getPatrolById()

getActivePatrol()

getCompletedPatrols()

completePatrol()

createPatrolEvent()

updatePatrolEvent()

deletePatrolEvent()

getEventsByPatrol()

addEventPhoto()

getPhotosByEvent()
```

Use transactions when a multi-step database operation must remain consistent.

---

# 27. Device Service Layer

Device APIs should also be abstracted.

Suggested structure:

```text
services/
  camera/
    cameraService.ts

  location/
    locationService.ts

  media/
    mediaStorageService.ts

  reports/
    reportService.ts

  sharing/
    sharingService.ts
```

UI components should not contain large amounts of filesystem, GPS, camera, or PDF implementation logic.

---

# 28. Suggested Project Architecture

Adapt this to the repository.

```text
src/
  components/

  screens/
    home/
    patrol/
    events/
    history/
    reports/

  features/
    patrol/
    events/

  data/
    database/
    repositories/

  services/
    camera/
    location/
    media/
    reports/
    sharing/

  hooks/

  types/

  constants/

  utils/

  theme/
```

If using Expo Router:

```text
app/
  index.tsx

  patrol/
    new.tsx
    active.tsx
    complete.tsx
    [id].tsx

  event/
    new.tsx
    [id].tsx
    edit.tsx

  history/
    index.tsx
```

Do not force this exact structure if the repository already has a consistent architecture.

---

# 29. Application State

Prefer local component state for temporary form state.

Persistent domain state belongs in SQLite.

Do not keep patrol data exclusively in Redux/Zustand/Context.

A state management library may cache/query database data, but SQLite should remain the persistence source of truth.

Use an app-wide state store only when it solves a real problem.

Avoid unnecessary global state.

---

# 30. Form Validation

Validation should be simple and user-friendly.

Examples:

Cannot create patrol without:

- ranger name
- valid forestry area

Cannot save event without:

- event type
- severity where applicable

Distance:

```text
>= 0
```

Notes should have a reasonable length limit.

Do not allow malformed data to enter database.

---

# 31. Permission Handling

Handle permissions gracefully.

Relevant permissions:

- Camera
- Location
- Photo library if implemented

Never crash because permission is denied.

Example:

```text
ForestLog cần quyền sử dụng camera để chụp ảnh hiện trường.
```

Actions:

```text
Thử lại
Tiếp tục không chụp ảnh
```

For location denial:

event recording should still work.

---

# 32. Error Handling

Avoid exposing technical errors such as:

```text
SQLITE_ERROR
ENOENT
PermissionDenied
```

directly to users.

Log technical details in development.

Show understandable Vietnamese messages.

Example:

```text
Không thể lưu ghi nhận.

Vui lòng thử lại.
```

Critical data operations should fail safely.

---

# 33. Offline Requirement

The MVP must pass this scenario:

1. User enables airplane mode.
2. Opens ForestLog.
3. Creates patrol.
4. Selects Tiểu khu / Khoảnh / Lô.
5. Records an event.
6. Takes a photo.
7. Saves GPS if device provides it.
8. Records several additional events.
9. Closes app.
10. Opens app again.
11. Continues active patrol.
12. Completes patrol.
13. Generates PDF.
14. Views patrol history.

All core functionality must remain operational without network access.

Sharing obviously requires whatever connectivity the chosen target app needs, but ForestLog itself should be able to generate the report offline.

---

# 34. UI/UX Design Principles

Visual identity should reflect:

- forestry
- field work
- reliability
- simplicity

Avoid a gaming-style interface.

Avoid excessive animations.

Avoid glassmorphism.

Avoid tiny controls.

Use:

- large touch targets
- clear labels
- high contrast
- cards
- clear status indicators
- consistent spacing

The application should remain readable under outdoor lighting.

---

# 35. Suggested Color Direction

Do not hardcode colors throughout components.

Create a theme.

Conceptual direction:

```text
Primary:
Forest green

Background:
Very light neutral / greenish white

Danger:
Red

Warning:
Amber

Success:
Green

Text:
Dark charcoal
```

Use semantic theme tokens such as:

```ts
colors.primary
colors.background
colors.surface
colors.text
colors.textSecondary
colors.danger
colors.warning
colors.success
colors.border
```

Accessibility contrast is more important than decorative styling.

---

# 36. Reusable Components

Create reusable primitives when appropriate.

Examples:

```text
Button

Card

Screen

Section

FormField

SelectField

EventTypeSelector

SeveritySelector

ForestAreaSelector

PhotoPicker

GPSStatus

PatrolCard

EventCard

EmptyState

ConfirmationModal

LoadingState
```

Do not create excessive abstraction for one-off UI.

---

# 37. Localization Preparation

MVP interface language:

**Vietnamese**

Do not necessarily implement a complete i18n framework unless already present.

However, avoid scattering domain labels everywhere.

Centralize labels.

Example:

```ts
export const EVENT_TYPE_LABELS = {
  illegal_logging: "Chặt phá rừng",
  illegal_hunting: "Bẫy / săn bắt trái phép",
  fire_risk: "Cháy / nguy cơ cháy",
  land_encroachment: "Xâm lấn đất",
  waste: "Rác thải",
  no_violation: "Không phát hiện vi phạm",
};
```

This will make future localization easier.

---

# 38. Date Handling

Store timestamps in a consistent machine-readable format.

Prefer ISO 8601.

Example:

```text
2026-08-14T09:12:30.000Z
```

Format timestamps for users only in the presentation layer.

Vietnamese display example:

```text
09:12 · 14/08/2026
```

Do not store formatted UI dates as database values.

---

# 39. IDs

Do not use array indexes as entity IDs.

Use UUID or another collision-resistant local identifier.

IDs must be generated offline.

Entities requiring IDs:

- Patrol
- PatrolEvent
- EventPhoto
- potentially ForestArea

---

# 40. Data Integrity

Protect against accidental data loss.

Important cases:

### App closes during patrol

Patrol survives.

### App closes while event is being saved

Avoid corrupted state.

### Photo was captured but event save fails

Clean temporary file where practical.

### Event is deleted

Associated photo metadata and files should be cleaned.

### Patrol is deleted in future

Associated events and photos must be cleaned safely.

Use database transactions where appropriate.

---

# 41. MVP Scope

Implement:

- Home screen
- Create patrol
- Forest area selection
- Active patrol
- Event creation
- Event photos
- GPS capture
- Event list
- Event details/edit/delete
- Complete patrol
- Patrol history
- Patrol details
- PDF generation
- Native sharing
- Offline local database
- Active patrol recovery

---

# 42. Explicitly Out of Scope

DO NOT implement the following unless they already exist and are essential:

- Google Maps
- Mapbox
- online map
- route tracking
- navigation
- real-time sync
- cloud backend
- user authentication
- admin website
- analytics dashboard
- push notifications
- chat
- AI image recognition
- machine learning
- satellite data
- weather API
- Zalo API
- email server
- social login
- online account system
- complicated role management

These belong to later phases.

---

# 43. Future Phase Compatibility

Although these features are out of scope, design the domain architecture so they could later support:

```text
Cloud synchronization

Multi-device users

Authentication

Station management

Administrative dashboard

Maps

Violation heatmaps

AI image classification

Automatic patrol route tracking

Centralized reporting

Province/district statistics
```

Do not implement them now.

Just avoid architectural decisions that make them unnecessarily difficult later.

---

# 44. Potential Future Sync Fields

When appropriate, entities may eventually need fields such as:

```ts
syncStatus?: "local" | "pending" | "synced" | "error";
remoteId?: string;
lastSyncedAt?: string;
```

Do NOT implement synchronization logic in MVP.

Only prepare for it if doing so does not add unnecessary complexity.

---

# 45. Testing

Add meaningful tests where the repository supports testing.

Priority:

### Domain / repository tests

Test:

```text
create patrol

retrieve active patrol

create events

event belongs to correct patrol

complete patrol

completed patrol no longer active

event count

delete event

forest area filtering
```

### Utility tests

Test:

```text
date formatting

report formatting

event labels

severity labels
```

Do not spend excessive MVP effort on snapshot testing visual components.

---

# 46. Critical Acceptance Tests

The implementation is considered successful only if these scenarios work.

## Scenario A — Basic Patrol

```text
Open app

→ Start patrol

→ Enter ranger

→ Select Tiểu khu / Khoảnh / Lô

→ Start

→ Record 3 events

→ Complete patrol

→ Patrol appears in history
```

---

## Scenario B — Offline

```text
Airplane mode ON

→ Open app

→ Start patrol

→ Record event

→ Take photo

→ Save event

→ Complete patrol

→ Generate PDF
```

No internet error should occur.

---

## Scenario C — App Restart

```text
Start patrol

→ Record event

→ Kill app

→ Reopen app
```

Result:

```text
Active patrol is detected.

Existing event still exists.

Existing photo still exists.

User can continue patrol.
```

---

## Scenario D — Report

Given a completed patrol containing three events:

Report must contain:

- ranger
- date/time
- forestry area
- weather
- distance
- emergency report status
- all three events
- event type
- severity
- notes
- coordinates when available
- attached photos

---

# 47. Performance

Expected MVP dataset may eventually contain:

- hundreds of patrols
- thousands of events
- thousands of images

Do not load all images into memory at once.

Use efficient queries.

Use indexes where useful.

Example:

```sql
CREATE INDEX idx_patrol_events_patrol_id
ON patrol_events(patrol_id);
```

and:

```sql
CREATE INDEX idx_event_photos_event_id
ON event_photos(event_id);
```

Use lazy rendering for long lists.

---

# 48. Security and Privacy

Patrol data may contain sensitive environmental enforcement information.

For MVP:

- do not transmit data without user action
- do not upload photos automatically
- do not include tracking SDKs unnecessarily
- do not send GPS coordinates to external APIs
- do not require analytics services

All patrol information should remain local unless the user intentionally shares a report.

Future encryption can be introduced later.

---

# 49. Code Quality Requirements

All new code should:

- use TypeScript
- use explicit interfaces/types
- avoid duplicated business logic
- keep functions focused
- use descriptive names
- avoid giant screen components
- avoid deeply nested JSX
- separate storage from UI
- gracefully handle async errors
- clean up listeners/resources where necessary

Do not create abstractions merely for abstraction's sake.

Prefer readable code.

---

# 50. Codex Implementation Workflow

Do NOT immediately generate dozens of unrelated files.

Work systematically.

### Step 1

Analyze repository.

Report:

```text
Current architecture

Existing dependencies

Navigation system

Persistence system

Important reusable components

Potential conflicts
```

### Step 2

Propose the minimal implementation structure.

Identify:

```text
files to create

files to modify

dependencies genuinely required
```

### Step 3

Implement database and domain models.

### Step 4

Implement repository layer.

### Step 5

Implement Home + Create Patrol.

### Step 6

Implement Active Patrol.

### Step 7

Implement Event recording.

### Step 8

Implement Camera / Image persistence.

### Step 9

Implement GPS.

### Step 10

Implement Complete Patrol.

### Step 11

Implement History and Details.

### Step 12

Implement PDF generation and sharing.

### Step 13

Test offline persistence and restart recovery.

### Step 14

Run:

```bash
npm run lint
```

and available:

```bash
npm run typecheck
npm test
```

or equivalent scripts defined by the project.

Fix errors introduced by the implementation.

Do not modify unrelated code solely to silence existing unrelated warnings.

---

# 51. Important Engineering Decision

The **database is the source of truth** for patrol information.

For example:

DO NOT structure the app like:

```ts
const [allPatrols, setAllPatrols] = useState([]);
```

and rely on that state permanently.

Instead:

```text
UI
↓
Hook / Controller
↓
Repository
↓
SQLite
```

UI state is temporary.

SQLite state is persistent.

---

# 52. UX Priority

The typical ranger workflow should minimize typing.

Prefer:

```text
tap
tap
photo
tap
save
```

over:

```text
long text forms
complex configuration
multiple nested screens
```

Important information should use selectors.

Free-text should mostly be limited to:

```text
Ranger name

Optional notes

Distance
```

---

# 53. Event Recording Speed

A ranger may need to record an incident quickly.

Optimize Event Form so common use could be:

```text
+ Ghi nhận

→ Chặt phá rừng

→ Cao

→ Chụp ảnh

→ Lưu
```

GPS should happen automatically in parallel.

The user should not have to manually press:

```text
Lấy GPS
```

under normal conditions.

---

# 54. Avoid Connectivity Assumptions

Never show loaders waiting indefinitely for network operations.

No screen should depend on:

```ts
fetch(...)
axios(...)
```

for core MVP data.

Forest area data is local.

Patrol data is local.

Event data is local.

Photos are local.

Reports are generated locally.

---

# 55. Empty States

Create useful empty states.

Examples:

History:

```text
Chưa có chuyến tuần tra nào.

Các chuyến tuần tra đã hoàn thành sẽ xuất hiện tại đây.
```

Active patrol event list:

```text
Chưa có ghi nhận nào.

Nhấn "+ Ghi nhận sự kiện" khi phát hiện tình huống trong quá trình tuần tra.
```

---

# 56. Confirmation Dialogs

Require confirmation for destructive/final actions.

Examples:

Delete event:

```text
Xóa ghi nhận?

Ghi nhận và ảnh liên quan sẽ bị xóa khỏi thiết bị.
```

Complete patrol:

```text
Kết thúc chuyến tuần tra?

Sau khi hoàn thành, chuyến tuần tra sẽ được lưu vào lịch sử.
```

Do not show confirmation for every ordinary action.

---

# 57. Suggested MVP Navigation

Conceptually:

```text
Home

├── New Patrol
│
├── Active Patrol
│   ├── New Event
│   ├── Event Detail
│   └── Complete Patrol
│
└── Patrol History
    └── Patrol Detail
        └── Report
```

Keep navigation shallow.

---

# 58. Report File Naming

Use predictable filenames.

Example:

```text
ForestLog_2026-08-14_TK12_K3_L7.pdf
```

Sanitize dynamic filename values.

Avoid spaces or unsafe characters where appropriate.

---

# 59. Logging

Development logging may include:

```text
database initialization

migration result

camera error

location error

report generation error
```

Do not log sensitive information unnecessarily.

Do not log full photo binaries.

Do not expose logs in production UI.

---

# 60. Development Seed Data

Create useful development forest area data.

Example:

```text
Tiểu khu 10
  Khoảnh 1
    Lô 1
    Lô 2

  Khoảnh 2
    Lô 1

Tiểu khu 11
  Khoảnh 1
    Lô 1
    Lô 2
    Lô 3

Tiểu khu 12
  Khoảnh 3
    Lô 5
    Lô 6
    Lô 7
```

Keep seed data isolated so real administrative data can later replace it.

---

# 61. README

Update project documentation when implementation is stable.

README should explain:

```text
What ForestLog is

Tech stack

How to install

How to run

How local storage works

How photos are stored

How GPS works

How to test offline mode

Current MVP functionality

Known limitations
```

Do not claim features that are not actually implemented.

---

# 62. Definition of Done

ForestLog MVP is done when a ranger can:

```text
1. Install/open the app.

2. Use the app without internet.

3. Create a patrol.

4. Select Tiểu khu → Khoảnh → Lô.

5. Record multiple field events.

6. Photograph evidence.

7. Capture GPS coordinates automatically.

8. Add optional notes.

9. Close the app without losing the patrol.

10. Reopen and continue patrol.

11. Complete the patrol.

12. View patrol history.

13. Open patrol details.

14. Generate a structured PDF.

15. Share that PDF using the native device share sheet.
```

No online server should be necessary for those operations.

---

# 63. Product Principle

When deciding between a technically impressive implementation and a reliable implementation, choose reliability.

ForestLog should feel like a field tool, not a consumer social application.

The most important attributes are:

```text
Reliable

Offline

Fast

Simple

Structured

Recoverable
```

The ranger must trust that:

> "Nếu tôi đã ghi nhận thì dữ liệu sẽ còn ở đó."

Protect that principle throughout the implementation.

---

# 64. Final Instructions to Codex

Start by inspecting the repository.

Do not start coding before understanding the existing architecture.

Then provide a concise implementation assessment containing:

```text
1. Current project architecture
2. What can be reused
3. Dependencies already available
4. Missing dependencies, if any
5. Database approach
6. Proposed file structure
7. Implementation order
```

After that assessment, proceed with implementation.

When implementing:

- make incremental changes
- keep the application runnable
- run TypeScript/lint checks periodically
- fix problems caused by your changes
- preserve existing application behavior unless intentionally replacing it
- do not implement features outside the ForestLog MVP scope
- do not add online dependencies to core workflows
- do not add maps

At the end, provide:

```text
IMPLEMENTATION SUMMARY

Implemented:
- ...

Architecture:
- ...

Database:
- ...

Offline behavior:
- ...

Permissions:
- ...

Report generation:
- ...

Files added:
- ...

Files modified:
- ...

Dependencies added:
- ...

Tests/checks performed:
- ...

Known limitations:
- ...

Recommended next step:
- ...
```

The final product should be a working **ForestLog Offline Patrol Reporting MVP**, not merely a UI prototype.