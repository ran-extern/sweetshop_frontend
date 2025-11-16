# SweetShop Frontend

React 19 + Vite single-page application that talks to the Django SweetShop backend. It includes JWT-based auth, react-router routing guards, and MSW-backed tests.

## Running locally

1. Install deps

	```bash
	npm install
	```

2. Start the dev server

	```bash
	npm run dev
	```

3. Run tests with the happy-dom environment

	```bash
	npx vitest run --environment happy-dom
	```

4. Build for production

	```bash
	npm run build
	```

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/` | Override to target another origin (must include trailing slash). |

Set this in a `.env` file if needed:

```
VITE_API_BASE_URL=https://sweetshop.example.com/api/
```

## Stack

- React 19 + Vite 7
- React Router DOM 7
- Axios with JWT refresh handling
- Vitest + MSW for testing
- Tailwind-ready (Tailwind dependency already installed should you choose to enable it)
