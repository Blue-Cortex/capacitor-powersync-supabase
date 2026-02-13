# Example App for PowerSync + Supabase Capacitor Plugin

This is an example application demonstrating the usage of the `@blue-cortex/capacitor-powersync-supabase` plugin with React and Vite.

## Prerequisites

- [Bun](https://bun.sh) installed globally.
- Xcode (for iOS) and Android Studio (for Android).

## Getting Started

1. Install dependencies:

   ```bash
   bun install
   ```

2. Configure environment variables:

   Copy the template file:

   ```bash
   cp .env.local.template .env.local
   ```

   Edit `.env.local` and add your PowerSync and Supabase credentials:

   ```bash
   VITE_POWERSYNC_URL=your_powersync_url
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```


## Running the App

### Web

To run the web development server:

```bash
bun run dev
```

### iOS

1. Build the web assets:

   ```bash
   bun run build
   ```

2. Sync with Capacitor:

   ```bash
   bunx cap sync
   ```

3. Open in Xcode:

   ```bash
   bunx cap open ios
   ```

### Android

1. Build the web assets:

   ```bash
   bun run build
   ```

2. Sync with Capacitor:

   ```bash
   bunx cap sync
   ```

3. Open in Android Studio:

   ```bash
   bunx cap open android
   ```

