# Bulk Import CSV Templates

Use these templates to quickly populate the Dindigul Performance Registry.

## Important Rules for All Imports
1. **File Format**: Files must be saved as standard CSV (Comma Separated Values).
2. **Encoding**: Ensure `UTF-8` encoding if you have special characters (Tamil/Hindi).
3. **Headers**: Do NOT change the header names (the first row). The system relies on these exact keys.
4. **Data Consistency**:
   - **SOL IDs**: Ensure Branch/Unit codes match exactly across files.
   - **Dates**: Preferred format is `YYYY-MM-DD`.

## Available Templates

### 1. `units.csv` (Unit Master)
Primary registry for all branches and offices.
- **Key Columns**: `SOL`, `English Name`, `Type` (BRANCH/RO/LPC), `Size`, `Population Group`.
- **Note**: The first `RO` type unit encountered will be treated as the Regional Office for hierarchy.

### 2. `atms.csv` (Equipment Master)
List of ATMs, CDMs, and CRMs.
- **Key Columns**: `BR CODE` (SOL), `ATM ID`, `DEVICE TYPE` (ATM/CDM), `MANAGEMENT` (BRANCH_MANAGED/OUTSOURCED).

### 3. `partners.csv` (Service Personnel)
External partners like Jewel Appraisers and BCs.
- **Key Columns**: `SOL`, `type` (JEWEL_APPRAISER/BC_INDIVIDUAL), `nameEn`, `registrationNo`.

### 4. `assets.csv` (Infrastructure)
Physical branch assets like Gensets and UPS.
- **Key Columns**: `SOL`, `assetCode`, `category` (GENSET/UPS), `description`.

### 5. `lockers.csv` (Locker Registry)
Detailed locker inventory per branch.
- **Key Columns**: `SOL`, `lockerNo`, `type` (Type-A to Type-L), `status` (AVAILABLE/LET_OUT).

### 6. `staff.csv` (User Registry)
Employee data.
- **Key Columns**: `username` (Employee No), `fullNameEn`, `branchCode` (SOL), `role` (ADMIN/RO_USER/BRANCH_USER).

### 4. `budgets.csv` (Strategic Targets)
Performance targets for specific metrics and dates.
- **Header Format**: `SOL`, followed by date columns (e.g., `31/03/2026`).

## Ingestion Order (Recommended)
1. **Departments & Designations**
2. **Units (Branches)** - *Required before Staff/ATMs*
3. **Staff**
4. **ATMs / Peripherals**
5. **Budgets / Registry**

## Troubleshooting
- **Missing Units**: If you import Staff for a branch that doesn't exist, the import will skip those records.
- **Duplicate IDs**: Uploading an ID that already exists will **Update** the existing record (Upsert).
