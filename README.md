# 🚀 Google BigQuery Client Plugin

A premium, interactive database management and query client designed for Google BigQuery. Supports executing queries, multi-statement SQL scripts, DDL/DML operations, dataset schema browsing, and performance telemetry.

---

## ✨ Features

### 1. Google BigQuery API Integration
*   **Query API**: Standard Google BigQuery SQL query execution (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`, etc.).
*   **Multi-Statement SQL Scripts**: Run complex SQL scripts and multi-statement queries.
*   **Dataset & Schema Explorer**: Browse BigQuery datasets, tables, and views with column data types and modes.
*   **Public Datasets**: Seamlessly access public datasets (e.g. `bigquery-public-data`).
*   **Job Status & Telemetry**: View execution duration (ms), total bytes processed, and job statistics.
*   **Sandbox & Paid Compatibility**: Fully compatible with both free BigQuery Sandbox projects and paid Google Cloud projects.

---

## 🔑 Google Cloud Setup Instructions

Follow these steps to connect your Google Cloud BigQuery project (works for both free Sandbox and Paid projects).

### Step 1: Create or Select a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top bar and click **New Project** (or select an existing project).
3. Note down your **Project ID** (e.g. `my-gcp-project-12345`).

### Step 2: Enable BigQuery API
1. Navigate to **APIs & Services > Library** in Google Cloud Console.
2. Search for **BigQuery API**.
3. Click **Enable**.

### Step 3: Create Service Account Credentials (JSON Key)
1. Go to **IAM & Admin > Service Accounts**.
2. Click **+ Create Service Account**.
3. Enter a name (e.g. `devscribe-bigquery-client`) and click **Create and Continue**.
4. Under **Grant this service account access to project**, add the following roles:
   - **BigQuery Admin** (or **BigQuery User** + **BigQuery Data Viewer** / **BigQuery Job User**)
5. Click **Done**.
6. Click on the newly created Service Account from the list.
7. Select the **Keys** tab -> Click **Add Key** -> Choose **Create new key**.
8. Select **JSON** format and click **Create**. The key file will automatically download to your computer.

### Step 4: Add Connection in DevScribe Plugin
1. Open the BigQuery Plugin inside DevScribe.
2. Click **+ New Connection**.
3. Fill in the connection form:
   - **Connection Name**: `My BigQuery Project`
   - **GCP Project ID**: `my-gcp-project-12345` (from Step 1)
   - **Service Account Key**: Open the downloaded JSON key file in any text editor, copy all text, and paste it into the JSON credentials box.
   - **Location**: `US` (or `EU`, `asia-east1`, etc.)
4. Click **Test Connection** to verify access, then click **Save Connection**.

---

## 🛠 Tech Stack

*   **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **SDK**: [@google-cloud/bigquery](https://www.npmjs.com/package/@google-cloud/bigquery)
*   **Build Utility**: [Vite 8](https://vite.dev/)
*   **Editor Module**: [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
*   **Icons**: [Lucide React](https://lucide.dev/)

---

## 📂 Project Structure

```text
big-query/
├── backend/
│   └── index.js             # Node.js backend module with @google-cloud/bigquery API calls
├── release/                 # Packaged zip distribution files
├── src/
│   ├── components/          # Reusable UI modules
│   │   ├── AddConnectionForm.tsx     # BigQuery credentials & connection form
│   │   ├── ConnectionManagement.tsx  # Connection registry & dataset selection
│   │   ├── DBTopbar.tsx              # Breadcrumbs, schema navigation, execution controls
│   │   ├── ErDiagram.tsx             # Interactive Entity-Relationship diagram
│   │   ├── QueryEditor.tsx           # Monaco SQL Editor
│   │   ├── ResultSection.tsx         # Results grid, JSON view, telemetry
│   │   └── SchemaSidebar.tsx         # Datasets, tables, views, and columns inspector
│   ├── views/
│   │   └── DbQueryPage.tsx           # Main BigQuery view page
│   ├── App.tsx              # Application layout root
│   ├── index.css            # Base design system tokens & theme variables
│   └── ipc.ts               # IPC messaging router
├── manifest.json            # Plugin manifest
└── package.json             # Scripts and dependencies
```

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm (v9 or higher)

### Setup and Running Local Server

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start development server**:
    ```bash
    npm run dev
    ```

3.  **Package for Release**:
    ```bash
    npm run build
    npm run package
    ```
