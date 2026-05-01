# PROJECT CONTEXT
## Urban Tree Infrastructure Management System
### Liên Chiểu District, Đà Nẵng City

---

## Business Goal

Build a smart urban tree infrastructure management system for Liên Chiểu District, Đà Nẵng.

The system manages:
- Urban tree inventory (digital asset model — each tree has a unique ID, GPS coordinates, and an electronic profile)
- GIS visualization on an interactive 3D map
- Maintenance workflow (scheduling, task assignment, completion tracking)
- Mobile field operations (field staff receive tasks, navigate to tree location, and submit updates on-site)
- Geofencing verification (staff can only mark a task "Done" when their GPS is within 10m of the tree)
- Dashboard analytics (real-time reports on tree health, maintenance progress, species distribution)

**Core problem solved:** Eliminate the information gap between fieldwork and office management — replacing manual notebooks and delayed Excel reports with a real-time, location-verified data pipeline.

---

## Tech Stack

**Frontend:**
- React
- TypeScript
- Tailwind CSS

**Backend:**
- NestJS (Node.js framework)
- PostgreSQL + PostGIS (spatial queries, e.g. "find all trees within 100m of point X")

**GIS / Mapping:**
- CesiumJS (3D interactive map, terrain rendering)
- OpenStreetMap (OSM) — base map layer (roads, landmarks)
- Cesium ion — 3D tile hosting and streaming

**Infrastructure & Tooling:**
- Cloud Storage (field photo uploads)
- GitHub + GitHub Copilot (source control + AI-assisted coding)
- 15 AI Agents executing development tasks under PM supervision

---

## User Roles

| Role | Access Level | Primary Interface |
|---|---|---|
| **Admin** | Full system access; manage user accounts, system config | Web Dashboard |
| **Manager** | Plan maintenance schedules, view reports, approve major data changes | Web Dashboard |
| **Staff** | View assigned tasks, navigate to tree location, update tree status, submit incident reports | Mobile App |

**Permission rules:**
- Staff cannot access the management dashboard or modify master data.
- Manager cannot manage user accounts (Admin only).
- All data updates from Staff are subject to geofencing validation before acceptance.

---

## Core Modules

### 1. Authentication
- Role-based login (Admin / Manager / Staff)
- JWT session management
- Role-based route guarding (web + mobile)

### 2. Tree Management
Manage the full digital profile of each tree:
- **Fields:** Tree ID, GPS coordinates (Lat/Long/Height), street/area name, species (common + scientific name), year planted, height (m), trunk diameter (cm), canopy diameter (m), health status (Good / Weak / Diseased / Dead), lean angle, last maintenance date, maintenance history log
- **Operations:** Add new tree, update attributes, mark as removed, bulk import via CSV/GPS device
- **Validation:** Data changes by Staff require Manager approval

### 3. GIS Map
Interactive 3D map powered by CesiumJS:
- **Layers:**
  - Base layer: OpenStreetMap (roads, landmarks)
  - Terrain layer: Cesium World Terrain (real elevation)
  - Object layer: Tree data from PostgreSQL/PostGIS
- **Visualization:** Color-coded markers by health status (Green = Good, Yellow = Weak, Red = Diseased/Dangerous)
- **Interaction:** Click marker → Infobox (photo, species, height, pruning history)
- **Dynamic filters:**
  - By species
  - By health status
  - By administrative area or radius around current location (e.g. within 500m)
  - By physical parameters (e.g. height > 10m → Class 3 trees requiring special monitoring)

### 4. Maintenance
- Auto-generate maintenance schedules based on tree profiles
- Task list per day per staff member
- Task statuses: Pending → In Progress → Completed
- Maintenance types: Pruning / Fertilizing / Watering / Inspection
- Geofencing enforcement: "Complete" button only activates when staff GPS is within 10m of tree coordinates
- Manager view: real-time progress tracking across all active tasks

### 5. Mobile Workflow
Field-optimized mobile app for Staff:
- Login and role-based view
- Receive daily task list with tree location
- Navigate to tree via in-app GPS
- Update tree status on-site (health, physical measurements, notes)
- Capture and upload field photos
- Submit incident reports (e.g. fallen tree, disease outbreak)
- Geofencing check runs automatically before task completion is accepted

### 6. Dashboard Analytics
Real-time reporting for Managers and Admins:
- **Summary cards:** Total trees, trees by health status, pending maintenance tasks
- **Charts:**
  - Bar chart: tree count by species
  - Pie chart: health status distribution
  - Line chart: maintenance completion rate over time
- **Alerts:** Overdue maintenance tasks, trees flagged as Dangerous
- **Export:** PDF/Excel reports on demand

---

## Data Architecture

| Data Type | Storage |
|---|---|
| Spatial & attribute data | PostgreSQL + PostGIS |
| Field photos | Cloud Storage |
| 3D map tiles | Cesium ion |

**Key spatial query example:**
```sql
-- Find all trees within 100m of a given point
SELECT * FROM trees
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
  100
);
```

---

## AI Agent Team (15 Agents)

| # | Agent Role | Key Deliverables |
|---|---|---|
| 1 | AI System Architect | System design, API contracts, DB schema |
| 2 | AI Backend Developer (Core) | NestJS modules: Auth, Tree, Maintenance |
| 3 | AI Backend Developer (GIS) | PostGIS queries, spatial API endpoints |
| 4 | AI Frontend Developer (Web) | React web app, Dashboard, Map UI |
| 5 | AI Frontend Developer (Mobile) | Mobile app UI, GPS integration |
| 6 | AI UI/UX Designer | Wireframes, component design system |
| 7 | AI Data / Integration Engineer | Data import pipeline, CSV/GPS ingestion |
| 8 | AI QA Engineer (Backend) | API test suites, integration tests |
| 9 | AI QA Engineer (Frontend) | E2E tests, mobile UI testing |
| 10 | AI DevOps Engineer | CI/CD pipeline, Docker, cloud deployment |
| 11 | AI Security Engineer | Auth hardening, geofencing validation logic |
| 12 | AI Database Administrator | DB optimization, indexing, backup strategy |
| 13 | AI Mobile Developer | Native GPS, geofencing SDK integration |
| 14 | AI Documentation Engineer | API docs, user manuals, onboarding guides |
| 15 | AI Support / Maintenance Agent | Bug triage, hotfix support post-launch |

**Operating principle:** AI Agents execute — Human PM Team plans, coordinates, and takes responsibility.

---

## Project Management Team

| Member | Team Lead Role | Responsibilities |
|---|---|---|
| SV1 | Technical Lead | Scope management, WBS, technical decisions, AI agent task assignment |
| SV2 | Schedule & Cost Lead | Estimation (Function Point / COCOMO), Gantt chart, cost tracking |
| SV3 | Quality & Risk Lead | Quality plan, risk register, communication plan, PM–AI coordination |

---

*Document version: 1.0 — Based on project brief and course requirements (Software Project Management)*
