import {defineConfig} from '@playwright/test';
// Two local servers: the dev server (website at /, app at /app/, operator simulator at /app/studio/) and a
// GitHub Pages stand-in that serves only the app directory under /tbyb-mvp-miku/app/ (e2e/base-path.spec.mjs).
export default defineConfig({testDir:'./e2e',fullyParallel:false,workers:1,timeout:30000,reporter:'list',use:{baseURL:'http://127.0.0.1:4317',headless:true,screenshot:'only-on-failure'},projects:[{name:'light',use:{colorScheme:'light'}},{name:'dark',use:{colorScheme:'dark'}}],outputDir:'artifacts/playwright',webServer:[{command:'npm run dev',url:'http://127.0.0.1:4317',reuseExistingServer:true},{command:'node scripts/serve-pages.mjs',url:'http://127.0.0.1:4318/tbyb-mvp-miku/app/',reuseExistingServer:true}]});
