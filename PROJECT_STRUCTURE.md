# KC TELECOM — Project Structure

Full repository tree (excluding `node_modules/`, build output, and `.git/`,
all of which are covered by `.gitignore`).

```
kc-telecom/
├── .env.example                    # Backend + Docker Compose environment template
├── .gitignore
├── .dockerignore                   # Backend build context excludes
├── Dockerfile                      # Backend multi-stage production build
├── docker-compose.yml              # postgres + backend + frontend services
├── nest-cli.json
├── package.json
├── tsconfig.json
├── README.md
├── PROJECT_STRUCTURE.md            # This file
├── VERSION.md                      # Release summary
│
├── docs/
│   ├── DEPLOYMENT.md                # Full deployment walkthrough (Docker)
│   ├── PRODUCTION_CHECKLIST.md      # Production readiness status
│   └── SMOKE_TEST.md                # End-to-end smoke test (real endpoints/payloads)
│
├── prisma/
│   ├── schema.prisma                 # Data model: User, Wallet, WalletTransaction,
│   │                                 #   PinBatch, RechargePin, PinPurchase
│   ├── seed.ts                       # Bootstrap admin account creation
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20260101000000_init/
│           └── migration.sql         # Initial schema migration
│
├── src/                               # NestJS backend
│   ├── main.ts                        # Bootstrap: helmet, CORS, global prefix, validation
│   ├── app.module.ts
│   │
│   ├── auth/                          # Registration, login, JWT strategy
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── types/
│   │       └── jwt-payload.type.ts
│   │
│   ├── wallet/                        # Funding requests, admin confirmation, ledger
│   │   ├── wallet.controller.ts
│   │   ├── wallet.service.ts
│   │   ├── wallet.module.ts
│   │   └── dto/
│   │       └── fund-wallet.dto.ts
│   │
│   ├── admin/pin-stock/               # Batch creation, bulk PIN upload, inventory
│   │   ├── pin-stock.controller.ts
│   │   ├── pin-stock.service.ts
│   │   ├── pin-stock.module.ts
│   │   └── dto/
│   │       ├── create-batch.dto.ts
│   │       └── upload-pins.dto.ts
│   │
│   ├── vendor/pin-purchase/            # Stock browsing, purchase, PIN retrieval
│   │   ├── pin-purchase.controller.ts
│   │   ├── pin-purchase.service.ts
│   │   ├── pin-purchase.module.ts
│   │   └── dto/
│   │       └── purchase-batch.dto.ts
│   │
│   ├── reports/                        # Sales ledger, profit summary
│   │   ├── reports.controller.ts
│   │   ├── reports.service.ts
│   │   └── reports.module.ts
│   │
│   ├── prisma/                         # Global PrismaService
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   │
│   └── common/                         # Guards, decorators, exception filter
│       ├── guards/
│       │   ├── jwt-auth.guard.ts
│       │   └── roles.guard.ts
│       ├── decorators/
│       │   ├── current-user.decorator.ts
│       │   └── roles.decorator.ts
│       └── filters/
│           └── all-exceptions.filter.ts
│
└── frontend/                           # React + Vite + TypeScript
    ├── .env.example                    # VITE_API_BASE_URL
    ├── .dockerignore
    ├── Dockerfile                      # Frontend multi-stage build (nginx)
    ├── nginx.conf                      # SPA routing (try_files fallback)
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── vite-env.d.ts
        ├── components/
        │   ├── Layout.tsx
        │   ├── ProtectedRoute.tsx
        │   └── ui.tsx
        ├── context/
        │   └── AuthContext.tsx
        ├── lib/
        │   ├── api.ts                  # API client — mirrors every backend route
        │   └── format.ts
        ├── types/
        │   └── index.ts
        └── pages/
            ├── auth/
            │   ├── Login.tsx
            │   └── Register.tsx
            ├── admin/
            │   ├── AdminDashboard.tsx
            │   ├── CreateBatch.tsx
            │   ├── UploadPins.tsx
            │   ├── Inventory.tsx
            │   ├── Vendors.tsx
            │   ├── Sales.tsx
            │   └── Reports.tsx
            └── vendor/
                ├── VendorDashboard.tsx
                ├── BuyPins.tsx
                ├── MyPurchases.tsx
                ├── PurchasedPins.tsx
                ├── Wallet.tsx
                └── Transactions.tsx
```
