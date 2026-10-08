
Web (Next.js)
     │
     │ 1. "I want to upload image.jpg"
     ▼
Next.js Server
     │
     │ 2. Generate presigned S3 URL
     ▼
Web
     │
     │ 3. PUT image directly to S3
     ▼
AWS S3
     │
     │ 4. Tell server upload completed
     ▼
Next.js Server
     │
     │ 5. Save media record
     ▼
PostgreSQL

                    ┌──────────────┐
                    │ Next.js Web  │
                    └──────┬───────┘
                           │
                    request upload URL
                           │
                           ▼
                    ┌──────────────┐
                    │ Next.js API  │
                    └──────┬───────┘
                           │
                    presigned URL
                           │
                           ▼
                    ┌──────────────┐
                    │   AWS S3     │
                    │              │
                    │ original     │
                    │ annotated    │
                    └──────┬───────┘
                           │
                           ▼
                       BullMQ
                           │
                           ▼
                        Worker
                           │
                           ▼
                      AI Service
                       YOLO/OpenCV


packages/services/src/

├── infra/
│   ├── storage/
│   │   └── s3.service.ts
│   └── queue/
│       └── bullmq.service.ts
│
├── repositories/
│   ├── media.repository.ts
│   └── inspection.repository.ts
│
└── service/
    ├── media.service.ts
    └── inspection.service.ts


You are a senior full-stack/backend engineer working inside the **HopperAudit** monorepo.

Your task is to implement the complete **media upload and asynchronous AI-processing pipeline** using the existing architecture. Do not redesign the architecture or introduce unnecessary frameworks.

## Project Architecture

The repository follows this structure:

```text
hopper-audit/
├── apps/
│   ├── web/                 # Next.js frontend
│   ├── server/              # Next.js API/server
│   └── worker/              # BullMQ worker
│
├── packages/
│   ├── database/            # Prisma + PostgreSQL
│   ├── services/            # Business logic + infrastructure services
│   ├── ui/
│   └── ...
│
├── data/                    # AWS/Flocki-related configuration/files
│
└── ...
```

The AI system is a separate application and must remain independent:

```text
AI Service
├── Python
├── YOLO
├── OpenCV
└── image/video processing
```

The worker is responsible for consuming queue jobs. It must **not contain the AI implementation itself**.

---

# Core Architecture

Implement this flow:

```text
                     ┌──────────────┐
                     │  Next.js Web │
                     └──────┬───────┘
                            │
                    1. Request upload URL
                            │
                            ▼
                     ┌──────────────┐
                     │ Next.js API  │
                     │   Server     │
                     └──────┬───────┘
                            │
                    2. Presigned URL
                            │
                            ▼
                     ┌──────────────┐
                     │    AWS S3    │
                     │              │
                     │ original     │
                     │ annotated    │
                     └──────┬───────┘
                            │
                    3. Upload directly
                            │
                            ▼
                     Next.js Web
                            │
                    4. Upload complete
                            │
                            ▼
                     Next.js API
                            │
                    5. Save Media
                            │
                            ▼
                     PostgreSQL
                            │
                    6. Queue analysis
                            │
                            ▼
                         BullMQ
                            │
                            ▼
                         Worker
                            │
                            ▼
                      AI Service
                      YOLO/OpenCV
                            │
                            ▼
                          S3
                   annotated image/result
                            │
                            ▼
                     PostgreSQL
```

The browser must upload media **directly to S3** using a presigned URL.

Do NOT send the actual image binary through the Next.js server.

---

# Services Architecture

Use this structure:

```text
packages/services/src/

├── infra/
│   ├── storage/
│   │   └── s3.service.ts
│   │
│   └── queue/
│       └── bullmq.service.ts
│
├── repositories/
│   ├── media.repository.ts
│   └── inspection.repository.ts
│
└── service/
    ├── media.service.ts
    └── inspection.service.ts
```

Keep responsibilities strictly separated.

## Infrastructure

### `s3.service.ts`

Responsible only for S3 operations.

Implement functions equivalent to:

```ts
generateUploadUrl()
generateDownloadUrl()
deleteObject()
objectExists()
```

The service should:

* use AWS SDK
* generate presigned PUT URLs
* generate signed GET URLs when required
* never contain business logic
* never directly manipulate Prisma records
* never decide inspection status
* never enqueue jobs

Use environment variables for AWS configuration.

Do not hardcode:

* AWS credentials
* bucket name
* region
* URLs

---

### `bullmq.service.ts`

Responsible only for queue infrastructure.

Implement functionality equivalent to:

```ts
addInspectionJob()
getQueue()
```

Use:

```text
Redis
↓
BullMQ
↓
Worker
```

The queue payload should contain enough information for the worker to process the inspection without exposing unnecessary data.

Prefer a payload similar to:

```ts
{
  inspectionId: string;
}
```

The worker can retrieve the inspection and associated media from PostgreSQL.

Do not put YOLO/OpenCV logic inside this service.

---

# Repository Layer

Repositories are responsible for database access only.

They must NOT contain business rules.

## `media.repository.ts`

Implement database operations such as:

```ts
create()
findById()
findByInspectionId()
update()
delete()
```

Use Prisma.

The repository should deal with persistence only.

---

## `inspection.repository.ts`

Implement database operations such as:

```ts
create()
findById()
findWithMedia()
updateStatus()
updateResult()
```

Again:

**Repository = database operations only.**

Do not calculate contamination scores here.

Do not generate S3 URLs here.

Do not enqueue BullMQ jobs here.

---

# Media Service

`packages/services/src/service/media.service.ts`

This is the business layer for media.

Implement a flow similar to:

```text
requestUpload()
      ↓
generate S3 object key
      ↓
generate presigned URL
      ↓
return upload information
```

The service should generate an S3 object key such as:

```text
inspections/{inspectionId}/media/{mediaId}/original/{filename}
```

Do not store the presigned URL in PostgreSQL.

Store the stable S3 object key.

For example:

```text
originalKey:
inspections/abc/media/xyz/original/image.jpg
```

Presigned URLs expire and therefore must not be treated as permanent database values.

---

# Upload Flow

Implement this exact lifecycle.

## Step 1 — Create Inspection

The frontend calls:

```http
POST /api/v1/inspections
```

The server creates an inspection in PostgreSQL.

Example response:

```json
{
  "id": "inspection-id",
  "status": "PENDING"
}
```

---

# Step 2 — Request Upload URL

The frontend calls:

```http
POST /api/v1/inspections/{inspectionId}/media/upload-url
```

Request:

```json
{
  "filename": "image.jpg",
  "contentType": "image/jpeg"
}
```

The server:

1. authenticates the user
2. verifies the inspection exists
3. verifies the user can modify the inspection
4. generates a media ID
5. generates an S3 object key
6. generates a presigned PUT URL
7. returns the upload information

Example response:

```json
{
  "mediaId": "media-id",
  "uploadUrl": "presigned-url",
  "key": "inspections/.../original/image.jpg"
}
```

Do not expose AWS credentials to the frontend.

---

# Step 3 — Browser Uploads Directly to S3

The Next.js web application performs:

```http
PUT <presigned-url>
Content-Type: image/jpeg

<binary image>
```

The image must go directly:

```text
Browser → S3
```

NOT:

```text
Browser → Next.js → S3
```

The server must never proxy the image unless there is an explicit architectural reason.

---

# Step 4 — Confirm Upload

After the S3 PUT succeeds, the frontend calls:

```http
POST /api/v1/media/{mediaId}/complete
```

The server should:

1. authenticate the user
2. retrieve the media record
3. verify ownership/authorization
4. verify that the S3 object exists
5. mark the media as uploaded/ready
6. persist the media metadata

Do not trust the frontend saying:

```json
{
  "uploaded": true
}
```

The server should verify the object exists in S3.

---

# Step 5 — Persist Media

The PostgreSQL record should contain stable metadata.

Prefer:

```text
id
inspection_id
type
original_key
annotated_key
created_at
```

Do NOT store:

```text
presigned upload URL
presigned download URL
```

Those URLs are temporary.

---

# Step 6 — Start Analysis

Expose an endpoint such as:

```http
POST /api/v1/inspections/{inspectionId}/analyze
```

The server must:

1. authenticate the user
2. verify inspection ownership/access
3. retrieve associated media
4. verify at least one media item is uploaded
5. prevent duplicate processing where appropriate
6. update inspection status to `PROCESSING`
7. enqueue a BullMQ job

Example:

```ts
await queue.add("inspection-analysis", {
  inspectionId,
});
```

Return immediately:

```json
{
  "inspectionId": "inspection-id",
  "status": "PROCESSING"
}
```

Do not wait for YOLO inference inside the HTTP request.

---

# Worker

`apps/worker` is responsible for asynchronous execution.

The worker should:

```text
BullMQ job
    ↓
retrieve inspection
    ↓
retrieve media metadata
    ↓
call AI service
    ↓
receive detection results
    ↓
persist results through services
    ↓
update inspection
```

The worker must NOT contain:

* YOLO implementation
* OpenCV implementation
* contamination scoring rules
* S3 business logic
* Prisma queries scattered throughout worker code

Use the existing `packages/services` layer.

---

# AI Service

The AI service is independent from the Node.js monorepo application layer.

Expected architecture:

```text
Python AI Service
├── YOLO
├── OpenCV
├── image preprocessing
├── object detection
├── annotation generation
└── detection response
```

The worker communicates with the AI service through a clean API.

Example:

```http
POST /analyze
```

The worker sends something conceptually like:

```json
{
  "inspectionId": "...",
  "media": [
    {
      "mediaId": "...",
      "originalKey": "..."
    }
  ]
}
```

The AI service should return structured detection results.

Example:

```json
{
  "inspectionId": "...",
  "results": [
    {
      "mediaId": "...",
      "detections": [
        {
          "category": "battery",
          "confidence": 0.94,
          "x": 0.42,
          "y": 0.31,
          "width": 0.12,
          "height": 0.18
        }
      ],
      "annotatedKey": "inspections/.../annotated/image.jpg"
    }
  ]
}
```

The exact AI implementation is outside this task.

Create a clean interface/client for communicating with it.

---

# Important Separation of Responsibilities

Maintain these boundaries:

```text
WEB
↓
UI / user interaction

SERVER
↓
HTTP/API/application orchestration

SERVICES
↓
business logic + infrastructure abstraction

REPOSITORIES
↓
PostgreSQL persistence

S3 SERVICE
↓
AWS S3 operations

BULLMQ SERVICE
↓
queue operations

WORKER
↓
background job execution

AI SERVICE
↓
YOLO/OpenCV inference
```

Do not mix these responsibilities.

---

# Error Handling

Implement proper failure handling.

Examples:

### Upload URL generation fails

Return an appropriate API error.

### S3 upload fails

Frontend should be able to retry.

### Upload completion is called but S3 object does not exist

Reject the request.

### Queue submission fails

Do not leave the inspection silently stuck in `PROCESSING`.

Use a safe state transition strategy.

### AI service fails

The worker should mark the inspection as:

```text
FAILED
```

and preserve useful error information in logs.

### AI returns invalid data

Validate the response before writing detections to PostgreSQL.

---

# Database Consistency

Use Prisma transactions where multiple database changes must succeed together.

For example, when AI processing finishes:

```text
create detections
+
update inspection result
+
update inspection status
```

should be committed atomically.

Conceptually:

```ts
await prisma.$transaction(async (tx) => {
  // create detections

  // calculate/store result

  // update inspection status
});
```

PostgreSQL remains the source of truth.

Redis/BullMQ is only the asynchronous job system.

S3 is the media storage system.

---

# Security Requirements

Implement the following:

* Never expose AWS credentials to the browser.
* Use presigned URLs.
* Validate MIME types.
* Validate file extensions.
* Enforce maximum upload size.
* Generate unpredictable object keys.
* Authorize access to inspections/media.
* Do not allow users to access arbitrary S3 keys.
* Never trust `inspectionId` or `mediaId` from the client without authorization checks.
* Do not store permanent public S3 URLs.
* Do not expose internal AWS configuration.
* Validate AI responses before persistence.

---

# API Design

Use consistent API naming.

Suggested endpoints:

```text
POST /api/v1/inspections

POST /api/v1/inspections/:inspectionId/media/upload-url

POST /api/v1/media/:mediaId/complete

POST /api/v1/inspections/:inspectionId/analyze

GET  /api/v1/inspections/:inspectionId

GET  /api/v1/inspections/:inspectionId/media
```

Follow the existing server conventions if these routes already exist.

Do not create duplicate routes.

---

# Frontend Upload Component

In `apps/web`, implement a reusable upload flow.

The component should:

```text
Select image
    ↓
Request presigned URL
    ↓
Upload directly to S3
    ↓
Show upload progress/state
    ↓
Confirm upload
    ↓
Associate media with inspection
```

Support multiple images because an inspection may contain multiple media files.

The frontend should clearly distinguish:

```text
Selecting
Uploading
Uploaded
Processing
Completed
Failed
```

Do not start AI processing until all selected media uploads have successfully completed.

---

# Environment Variables

Use environment variables and inspect the existing project before adding new ones.

Expected configuration may include:

```env
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

REDIS_URL=

AI_SERVICE_URL=
```

Never commit credentials.

Update `.env.example` rather than committing real secrets.

---

# Implementation Strategy

Before writing code:

1. Inspect the existing monorepo.
2. Inspect existing Prisma schema.
3. Inspect existing `packages/services`.
4. Inspect existing server routes.
5. Inspect existing worker implementation.
6. Inspect existing AWS/Flocki files in `data/`.
7. Reuse existing abstractions where possible.
8. Do not create duplicate database clients, Redis clients, or AWS clients.

Then implement incrementally.

Recommended order:

```text
1. S3 infrastructure service
2. Media repository
3. Media service
4. Upload URL API
5. Frontend direct S3 upload
6. Upload completion API
7. BullMQ infrastructure service
8. Analyze API
9. Worker job
10. AI service client/interface
11. Transactional result persistence
12. Error handling
13. Tests
```

---

# Testing Requirements

Test the complete vertical flow:

```text
Create inspection
      ↓
Request upload URL
      ↓
Upload image to S3
      ↓
Complete upload
      ↓
Verify media record
      ↓
Start analysis
      ↓
BullMQ job created
      ↓
Worker consumes job
      ↓
AI service called
      ↓
Detection result received
      ↓
Detection records persisted
      ↓
Inspection result persisted
```

Include tests for:

* unauthorized inspection access
* invalid MIME type
* missing S3 object
* duplicate completion
* duplicate analysis request
* S3 failure
* queue failure
* AI service failure
* invalid AI response
* successful processing

---

# Important Constraints

Do NOT:

* add Expo
* add another frontend framework
* replace Next.js server
* move AI logic into Node.js
* put YOLO/OpenCV inside the worker
* upload images through the Next.js server
* store presigned URLs permanently
* put database queries directly throughout the worker
* put business logic inside repositories
* put business logic inside `s3.service.ts`
* introduce unnecessary microservices
* redesign the existing monorepo

The target architecture is:

```text
Next.js Web
      │
      ▼
Next.js Server
      │
      ├──────────────► S3
      │
      ▼
packages/services
      │
      ├── repositories ───► PostgreSQL
      │
      ├── S3 service ─────► AWS S3
      │
      └── BullMQ service ─► Redis
                                  │
                                  ▼
                               Worker
                                  │
                                  ▼
                              AI Service
                              YOLO/OpenCV
```

The implementation should be production-oriented but hackathon-appropriate: clean boundaries, minimal unnecessary abstraction, strong error handling, and a working end-to-end vertical slice are more important than overengineering.
