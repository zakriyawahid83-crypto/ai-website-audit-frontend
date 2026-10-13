# AI Website Audit

A responsive, client-side website audit workspace built with React and Vite. The demo uses sample report data and simulates URL checks and audit progress locally; it does not call a backend.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build, run `npm run build`.
The API defaults to `http://127.0.0.1:8000`; set `VITE_API_BASE_URL` in a frontend `.env` file to use a different backend address.

## Demo interactions

- Enter a public website URL to see debounced validation; private and internal addresses are rejected.
- Toggle audit categories and run or cancel the simulated audit.
- Filter report history, open report previews, compare sample reports, or retry a failed website.
- Use the navigation drawer on small screens. All primary actions are keyboard accessible.
