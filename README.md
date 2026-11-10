# PlateCost

**Food costing and menu profitability, without the guesswork.**

PlateCost is a work-in-progress web application designed to help small food businesses manage ingredient costs, calculate recipe expenses, and understand menu profitability.

Built with **Next.js, TypeScript, and Supabase**, the project focuses on reliable financial calculations, structured data management, and a maintainable application architecture.

> **Project status:** Active development. Core costing and management functionality is implemented, but some areas of the application remain incomplete. PlateCost is not currently intended for production use.

---

## Features

### Ingredient Management
- Create, view, update, and manage ingredients.
- Track ingredient prices and associated costs.
- Maintain ingredient price history.
- Organize ingredient data for use in recipes.

### Recipe Costing
- Create and manage recipes.
- Associate ingredients with recipes.
- Calculate recipe costs from ingredient quantities and prices.
- Handle unit conversions during cost calculations.

### Menu Profitability
- Organize recipes into menu items.
- Calculate item costs and estimated profitability.
- Compare selling prices against calculated costs.
- Support more informed menu-pricing decisions.

### Financial Calculation Engine
- Decimal-based calculations designed to reduce floating-point precision issues.
- Dedicated costing and unit-conversion logic.
- Separation of financial calculations from presentation components.
- Automated unit tests for calculation behavior.

### Authentication and Data Isolation
- Supabase-based authentication.
- Protected application routes.
- PostgreSQL-backed data storage.
- Row-level security policies for user data isolation.

---

## Tech Stack

| Category | Technologies |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| Frontend | React |
| Styling | Tailwind CSS |
| Backend & Authentication | Supabase |
| Database | PostgreSQL |
| Testing | Automated unit and security verification scripts |

---

## Architecture

PlateCost separates its business logic, application workflows, data access, and user interface into distinct layers.

```text
PlateCost/
├── Domain Logic
│   ├── Financial calculations
│   ├── Costing rules
│   └── Unit conversions
│
├── Application Layer
│   └── Business workflows
│
├── Infrastructure
│   ├── Supabase integration
│   └── Database access
│
├── User Interface
│   ├── Dashboard
│   ├── Ingredients
│   ├── Recipes
│   └── Menu management
│
└── Database
    ├── PostgreSQL schema
    └── Security policies
```

*Conceptual architecture overview, not a literal directory listing.*

This separation helps keep financial calculations independently testable and limits unnecessary coupling between the interface and underlying business logic.

---

## Getting Started

### Prerequisites

You'll need:

- Node.js and npm
- A Supabase project
- Git

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd PlateCost
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local environment file using the repository's `.env.example` as a reference.

```bash
cp .env.example .env.local
```

Provide the Supabase configuration values required by the application.

**Never commit real environment credentials or service-role keys to GitHub.**

### 4. Set up the database

Create or configure your Supabase project and apply the SQL migrations included in the repository in their intended order.

Ensure the database schema and row-level security policies are applied before using the application.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing

PlateCost includes automated tests and verification scripts covering important parts of its functionality, including financial calculations and database access controls.

The repository also contains verification documentation for cross-tenant isolation and related security behavior.

Run the appropriate test scripts defined in `package.json` when developing or modifying the application.

> Existing verification reports are not a substitute for independently validating a deployment.

---

## Current Development Status

| Area | Status |
|---|---|
| Authentication | Implemented |
| Ingredient management | Implemented |
| Ingredient price history | Implemented |
| Recipe management and costing | Implemented |
| Menu costing and profitability | Implemented |
| Financial calculation engine | Implemented |
| Database security policies | Implemented |
| Automated verification | Present |
| Invoice functionality | Planned / incomplete |
| Settings | Incomplete |
| UI consistency and integration | Ongoing |

Some implemented features may still require additional integration, testing, or interface improvements.

---

## Security

PlateCost uses authentication and database-level row-level security to help isolate user data.

However, the application is still under development and has not undergone a comprehensive production security audit.

Before any real-world deployment, additional testing, security review, and configuration validation are recommended.

---

## Project Goals

PlateCost aims to make food costing more accessible to smaller food businesses by providing a unified place to manage ingredients, recipes, and menu economics.

The project also explores reliable financial computation, database security, and maintainable full-stack application design.

Future development may include expanded reporting, invoice workflows, improved settings, and further refinement of the user experience.

---

## Disclaimer

PlateCost is an independent, work-in-progress project. Financial outputs depend on the accuracy of the data provided and should be independently verified before being used for business decisions.

**Built with Next.js, TypeScript, and Supabase.**
