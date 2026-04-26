# DHS Check-In App

This is a Vite + React app connected to your Google Apps Script API.

## API
The app already uses:
https://script.google.com/macros/s/AKfycbw9mRofEQdVmM-RS9c6awsFWSz2HLxywNjBCoyU9MWC_AAIxfQYyf57tRKjN6FYo4-Isw/exec

## Local test
npm install
npm run dev

## Deploy to Vercel
1. Upload this folder to GitHub as a repo.
2. Go to https://vercel.com/new.
3. Import the repo.
4. Use these settings:
   - Framework: Vite
   - Build command: npm run build
   - Output directory: dist
5. Deploy.

## Event-day use
Open your Vercel URL on staff phone > tap SCAN > scan ticket QR > tap CHECK IN.

## Direct ticket URL
https://YOUR-VERCEL-URL.vercel.app/?ticket=DHS26-001
