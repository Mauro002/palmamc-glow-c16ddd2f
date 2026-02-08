# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Tutorial completo (IT): collegare un nuovo account Supabase

Se non hai più accesso al project Supabase attuale (esempio: il project ref presente in `.env` non appare nel tuo account), puoi migrare il frontend a un nuovo progetto in modo sicuro.

### 1) Crea un nuovo progetto Supabase

1. Vai su [supabase.com/dashboard](https://supabase.com/dashboard).
2. Clicca **New project**.
3. Scegli organization, nome progetto, password DB e regione.
4. Attendi che il provisioning sia completato.

### 2) Recupera URL e anon key del nuovo progetto

Nel nuovo progetto vai su:

- **Settings → API**
- copia:
  - `Project URL`
  - `anon public` key

### 3) Aggiorna il frontend locale (.env)

Nel file `.env` sostituisci i valori vecchi:

```bash
VITE_SUPABASE_PROJECT_ID="<nuovo_project_ref>"
VITE_SUPABASE_PUBLISHABLE_KEY="<nuova_anon_key>"
VITE_SUPABASE_URL="https://<nuovo_project_ref>.supabase.co"
```

Riavvia poi il dev server (`npm run dev`) dopo aver salvato.

### 4) Collega la CLI al nuovo progetto

Dal terminale nella root repo:

```bash
npx supabase login
npx supabase link --project-ref <nuovo_project_ref>
```

Se `link` fallisce con errore permessi, sei autenticato con l'account sbagliato:

```bash
npx supabase logout
npx supabase login
```

### 5) Applica schema e oggetti del database

Questo repository contiene migrazioni in `supabase/migrations`.
Per portarle sul nuovo progetto:

```bash
npx supabase db push
```

### 6) Imposta i secret server-side (PayPal)

Le credenziali PayPal **non** vanno nel frontend. Impostale nei secret delle Edge Functions:

```bash
npx supabase secrets set PAYPAL_CLIENT_ID="<paypal_live_client_id>" PAYPAL_SECRET="<paypal_live_secret>"
```

### 7) Deploy delle Edge Functions

```bash
npx supabase functions deploy create-paypal-order
npx supabase functions deploy capture-paypal-order
```

### 8) Verifica finale (checklist)

1. `npm run build` termina senza errori.
2. Checkout apre `https://www.paypal.com/checkoutnow` (live).
3. Le funzioni Supabase rispondono senza errori 401/500.
4. Esegui una transazione reale di importo minimo.

### 9) Deploy sul tuo dominio

Puoi pubblicare `dist/` su hosting esterno: Supabase non si disattiva automaticamente.
Assicurati solo che le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` del build/deploy puntino al nuovo progetto corretto.
