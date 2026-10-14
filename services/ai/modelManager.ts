# Upload the 3 ZIP files via drag & drop into the file explorer
# Then run:

# 1. Apply the code fixes
unzip img-vdo-upgrade.zip -d /tmp/upgrade
cp /tmp/upgrade/package.json ./
cp /tmp/upgrade/apps/api/package.json ./apps/api/
cp /tmp/upgrade/apps/worker/package.json ./apps/worker/
cp /tmp/upgrade/apps/web/package.json ./apps/web/
cp /tmp/upgrade/packages/shared/package.json ./packages/shared/
cp /tmp/upgrade/packages/video-generator/package.json ./packages/video-generator/
cp /tmp/upgrade/apps/api/src/index.ts ./apps/api/src/
cp /tmp/upgrade/apps/worker/src/index.ts ./apps/worker/src/
cp /tmp/upgrade/apps/api/src/routes/auth.ts ./apps/api/src/routes/
cp /tmp/upgrade/packages/video-generator/src/index.ts ./packages/video-generator/src/
cp /tmp/upgrade/packages/video-generator/src/storage.ts ./packages/video-generator/src/
cp /tmp/upgrade/Dockerfile ./
cp /tmp/upgrade/docker-compose.yml ./

# 2. Apply Android config
unzip img-vdo-android.zip -d /tmp/android
cp /tmp/android/capacitor.config.ts ./apps/web/
cp /tmp/android/next.config.js ./apps/web/
cp /tmp/android/api-client.ts ./apps/web/src/lib/
mkdir -p ./apps/web/android/app/src/main/res/xml
cp /tmp/android/network_security_config.xml ./apps/web/android/app/src/main/res/xml/ 2>/dev/null || true

# 3. Apply cloud deployment config
unzip img-vdo-cloud-config.zip -d /tmp/cloud
cp /tmp/cloud/.github/workflows/build-android.yml ./.github/workflows/
cp /tmp/cloud/railway.json ./
cp /tmp/cloud/render.yaml ./
cp /tmp/cloud/fly.toml ./
cp /tmp/cloud/docker-compose.cloud.yml ./
cp /tmp/cloud/Caddyfile ./
cp /tmp/cloud/.env.cloud.example ./.env
cp /tmp/cloud/setup-cloud.sh ./

# 4. Create the missing redis-client.ts
mkdir -p apps/api/src/lib
cat > apps/api/src/lib/redis-client.ts << 'EOF'
import { createClient } from "redis";
let client: ReturnType<typeof createClient> | null = null;
export async function getRedis() {
  if (client) return client;
  client = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  client.on("error", (err) => console.error("Redis error:", err));
  await client.connect();
  return client;
}
EOF

# 5. Run setup
chmod +x setup-cloud.sh
./setup-cloud.sh
