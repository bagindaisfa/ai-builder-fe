# AI Builder Frontend (Vite)

This is the main frontend implementation of AI Builder using React + Vite.

## Features

- **Studio Component**
  - Visual workflow editor using ReactFlow
  - Node-based system with multiple node types
  - Node selection panel
  - Properties panel for configuration
  - Live preview panel

- **Knowledge Component**
  - Knowledge base management interface
  - Document table view
  - Upload functionality
  - Configuration settings

## Tech Stack

- React 18
- Material UI
- ReactFlow
- Vite
- Axios for API communication

## Project Structure

```
/src
├── components/     # Reusable UI components
├── layouts/       # Main layout components
│   ├── studio/    # Workflow editor
│   └── knowledge/ # Knowledge management
├── assets/        # Static assets
└── utils/         # Utility functions
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Development

- Uses Material Dashboard 2 React as base
- Implements tab-based interface
- Hot Module Replacement (HMR) enabled
- ESLint configured for code quality

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:5000
```

## Contributing

Please follow the project's coding standards and submit PRs for review.
