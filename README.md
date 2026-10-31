# ReliefChain: Disaster Relief Resource Allocation & Routing System
### PES University - Department of Computer Science & Engineering
### DBMS Experiential Learning – Level 3 Project (2-Member Team)

[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-384--dim-green.svg)](https://github.com/pgvector/pgvector)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen.svg)](https://www.mongodb.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)

---

## 🌟 Overview & Problem Statement

In the immediate aftermath of natural catastrophes (floods, cyclones, landslides), disaster management organizations struggle with:
1. **Inventory Race Conditions**: Multiple logistics officers dispatching from the same warehouse stock simultaneously.
2. **Sub-optimal Routing & Delivery Deficits**: Dispatching supplies without knowing spherical distances or camp deficits.
3. **Unstructured Distress Processing**: Sifting through thousands of fuzzy, conversational SOS emergency messages without structured category tags.
4. **Aerial Reconnaissance Telemetry Gaps**: Ingesting high-velocity, polymorphic IoT drone sensor streams.

**ReliefChain** is an enterprise disaster response platform built on a dual-paradigm architecture:
- **Relational SQL (PostgreSQL 16)**: ACID transactions, stored procedures, triggers, views, and 3NF normalization for inventory balancing and fleet dispatch.
- **Vector Database (pgvector)**: 384-dimensional dense semantic embeddings for natural language distress call categorization and Cosine Distance similarity matching (`<=>`).
- **Document NoSQL (MongoDB 7.0)**: Drone reconnaissance telemetry, thermal survivor detection, and multi-stage aggregation pipeline analysis.

---

## 👥 2-Member Team Responsibilities Matrix

| Team Member | Core Domain | Responsibilities & Deliverables |
| :--- | :--- | :--- |
| **Member 1** | **Database Architect & Core Backend Lead** | • Conceptual ER modeling & 3NF relational schema.<br>• DDL scripts (`01_schema.sql`, `02_views.sql`, `03_procedures_and_triggers.sql`).<br>• ACID Stored Procedure `sp_process_resource_dispatch` with row-level locks (`SELECT ... FOR UPDATE`).<br>• Geospatial Haversine Stored Function `fn_find_nearest_warehouse_with_stock`.<br>• Triggers (`trg_chk_inventory_levels`, `trg_audit_request`, `trg_shipment_delivery`).<br>• Multi-table analytical views (`v_camp_deficit_matrix`, `v_fleet_readiness`, `v_active_disaster_dashboard`). |
| **Member 2** | **Full-Stack & NoSQL/Vector Specialist** | • pgvector 384-dimensional dense semantic embedding engine & Cosine similarity search.<br>• MongoDB NoSQL document schema & 4-Stage Aggregation Pipeline (`$match` &rarr; `$group` &rarr; `$project` &rarr; `$sort`).<br>• Stored Function `fn_calculate_camp_urgency_score`.<br>• Next.js 15 War Room dashboard & interactive tab routing.<br>• JWT authentication with bcrypt password hashing and Role-Based Access Control (RBAC).<br>• Evaluation SQL Lab workbench with live performance execution timer. |

---

## 🏗️ System Architecture & Database Paradigms

```
                      ┌────────────────────────────────────────┐
                      │    ReliefChain Web Application         │
                      │       (Next.js 15 + TypeScript)        │
                      └──────────────────┬─────────────────────┘
                                         │
             ┌───────────────────────────┼───────────────────────────┐
             │ REST API / Route Handlers │                           │
             ▼                           ▼                           ▼
  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────────┐
  │   PostgreSQL 16       │  │   pgvector Extension  │  │   MongoDB 7.0 (NoSQL)   │
  │   (Relational SQL)    │  │   (Vector Database)   │  │   (Document Store)      │
  ├───────────────────────┤  ├───────────────────────┤  ├─────────────────────────┤
  │ • ACID Transactions   │  │ • 384-dim Embeddings  │  │ • IoT Drone Telemetry   │
  │ • Stored Procedures   │  │ • HNSW Cosine Index   │  │ • Thermal Sensor Feeds  │
  │ • Haversine Functions │  │ • Cosine Distance (<=>│  │ • Aggregation Pipeline  │
  │ • Triggers & Audits   │  │ • Triage Categorizer  │  │ • Road Blockage Alerts  │
  │ • Analytical Views    │  │ • Unstructured Search │  │ • Situational Feeds     │
  └───────────────────────┘  └───────────────────────┘  └─────────────────────────┘
```

---

## 🚀 Quick Start Guide (Prerequisites: Node.js 18+, Docker Desktop)

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd "dbms miniproject"
npm install
```

### 2. Start PostgreSQL (pgvector) and MongoDB Containers
```bash
docker compose up -d
```
*Both containers (`reliefchain_postgres` and `reliefchain_mongo`) will start healthy on ports `5432` and `27017`.*

### 3. Seed Database Datasets
Run the automated seed commands:
```bash
# Seed PostgreSQL schema, views, procedures, and baseline records
Get-Content "sql\01_schema.sql" | docker exec -i reliefchain_postgres psql -U relief_admin -d reliefchain_db
Get-Content "sql\02_views.sql" | docker exec -i reliefchain_postgres psql -U relief_admin -d reliefchain_db
Get-Content "sql\03_procedures_and_triggers.sql" | docker exec -i reliefchain_postgres psql -U relief_admin -d reliefchain_db
Get-Content "sql\05_seed.sql" | docker exec -i reliefchain_postgres psql -U relief_admin -d reliefchain_db

# Seed MongoDB collections with drone telemetry and situational incidents
node scripts/seed-mongo.mjs
```

### 4. Run Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Authentication & Role-Based Access Control (RBAC)

Use the Role Switcher in the top header to evaluate permissions:

| Role | Demo Credentials | Capabilities |
| :--- | :--- | :--- |
| **`ADMIN`** (Disaster Coordinator) | `admin@reliefchain.org` / `admin123` | Full administrative oversight, declare crisis zones, execute global ACID dispatches, inspect audit trails. |
| **`LOGISTICS_STAFF`** (Depot Manager) | `logistics@reliefchain.org` / `logistics123` | Warehouse restock, dispatch allocations, fleet tracking, and carrier manifests. |
| **`FIRST_RESPONDER`** (Field Officer) | `responder@reliefchain.org` / `responder123` | Submit emergency SOS signals, triage camps, view local deficits, and confirm deliveries. |

---

## 🧪 Evaluator Walkthrough & Curriculum Features

### 1. ACID Transaction Resource Dispatch
- Navigate to **"ACID Dispatch & Routing"**.
- Select a pending request (e.g. Marina Beach Community Shelter).
- Notice that the origin warehouse dropdown is automatically sorted by **Geospatial Haversine Great-Circle Distance** (`fn_find_nearest_warehouse_with_stock`).
- Click **"Execute ACID Dispatch"**:
  - PostgreSQL stored procedure `sp_process_resource_dispatch` executes.
  - Rows are locked with `FOR UPDATE`.
  - Available stock is decremented and transferred to reserved.
  - A unique tracking code (e.g. `RC-20261031-7853`) is generated.
  - Fleet vehicle status updates to `IN_TRANSIT`.
  - Audit log row is written to `allocation_audit_log`.
- In the active dispatches table, click **"Mark Delivered"**:
  - Database trigger `trg_shipment_delivery` fires.
  - Vehicle is automatically returned to `AVAILABLE`.
  - Relief request is updated to `FULFILLED`.

### 2. Semantic Vector Search (pgvector)
- Navigate to **"Emergency SOS & Vector Triage"**.
- In the search bar, type natural language queries like:
  - *"infant baby formula and clean water"*
  - *"insulin prescription for diabetic elderly"*
  - *"trauma bandages and surgical splints for fractures"*
- Click **"Execute Vector Search"**:
  - PostgreSQL performs a vector search using `<=>` (Cosine Distance) over `vector(384)` embeddings indexed with HNSW.
  - Returns closest distress calls with confidence scores.

### 3. NoSQL Aggregation Pipeline (MongoDB)
- Navigate to **"Drone Telemetry (MongoDB NoSQL)"**.
- View the 4-stage pipeline aggregation results:
  - `$match` on active 24h window
  - `$group` by disaster sector
  - `$project` computed averages, road blockages count, and thermal survivor counts
  - `$sort` by hazard severity descending

### 4. Interactive SQL Lab
- Navigate to **"Evaluation SQL Lab"**.
- Click through presets for:
  - Multi-Table INNER & LEFT JOINs
  - GROUP BY & HAVING (> 300 units deficit)
  - Scalar Subqueries (Above-average medical stock)
  - Correlated Subqueries (`NOT EXISTS` for vulnerable camps without dispatches)
  - Stored Procedures and Views
- Click **"Run Query Live"** to see actual rows and execution latency.

---

## 📁 Repository Structure

```
├── sql/
│   ├── 01_schema.sql                  # DDL statements, constraints, and pgvector extension
│   ├── 02_views.sql                   # Complex analytical views
│   ├── 03_procedures_and_triggers.sql # ACID stored procedures, Haversine functions, and triggers
│   ├── 04_queries.sql                 # Curriculum DML operations (JOIN, GROUP BY, HAVING, subqueries)
│   └── 05_seed.sql                    # Realistic disaster relief dataset
├── scripts/
│   ├── seed-mongo.mjs                 # MongoDB telemetry and incident event feed seeder
│   └── test-connections.mjs          # Database connection test suite
├── src/
│   ├── app/
│   │   ├── api/                       # Next.js API Route Handlers (Auth, Dashboard, Camps, Requests, Inventory, Dispatch, SOS, Vector, Telemetry, SQL Lab)
│   │   ├── globals.css                # Premium Glassmorphic Dark UI design system
│   │   ├── layout.tsx                 # Root layout with typography and metadata
│   │   └── page.tsx                   # Master interactive War Room UI
│   └── lib/
│       ├── auth.ts                    # JWT and RBAC authentication helpers
│       ├── db/
│       │   ├── postgres.ts            # PostgreSQL pool and query client
│       │   └── mongo.ts               # MongoDB client and aggregation pipeline runner
│       └── vector/
│           └── semantic.ts            # 384-dimensional dense semantic vector embedding engine
├── docs/
│   └── DBMS_Level3_Project_Report_ReliefChain.md # Comprehensive Soft Copy Project Report
├── docker-compose.yml                 # PostgreSQL (pgvector) and MongoDB container services
├── package.json
└── README.md
```

---

## 📜 Academic Integrity & Citation
Developed strictly for the **PES University DBMS Experiential Learning – Level 3** course requirements. All schema definitions, stored procedures, triggers, algorithms, and application code are original implementations.
