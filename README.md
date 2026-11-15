# Myco

Expo / React Native mushroom grow tent dashboard.

## Cloud setup (Supabase)

The cloud foundation uses the existing Supabase project. User accounts are isolated by database Row Level Security. The mobile app uses only the Supabase publishable key; the service-role key stays inside Supabase Edge Functions.

1. Check out the `feature/supabase-cloud-foundation` branch.
2. Install dependencies and let Expo select SDK-compatible native package versions:

   ```powershell
   npm install
   npx expo install @supabase/supabase-js @react-native-async-storage/async-storage expo-secure-store react-native-url-polyfill
   ```

3. Copy `.env.example` to `.env` and set the Supabase publishable key from the project's API Keys page.
4. Restart Expo after changing environment variables:

   ```powershell
   npx expo start -c
   ```

5. Create an account on the login screen. If email confirmation is enabled in Supabase Auth, confirm the email before signing in.

## Raspberry Pi setup

For the beginner-friendly two-command Pi uploader installation, see [the Raspberry Pi setup guide](pi/README.md). Device registration and token issuance in the app are still pending; the Pi installer requires a real token issued for the tent.

## Important

- Do not commit `.env`.
- Never put a Supabase secret/service-role key or a Raspberry Pi device token in the mobile app.
- The dashboard still reads the local Pi API at the configured LAN address. The cloud telemetry path is separate and is not active until a tent and device token are provisioned.
- The Raspberry Pi's existing humidity controller is not changed by this app branch.

## Validation

After installing packages, run:

```powershell
npx expo install --check
npx expo lint
npx tsc --noEmit
```

The app has not yet been run on a physical phone from this branch. Validate the login and existing Pi dashboard locally before merging.
