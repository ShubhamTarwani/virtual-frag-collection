import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'https';

// Manual env loader helper to avoid dotenv external dependency and type check errors
function loadEnvFile(filePath: string) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(absolutePath)) {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    content.split(/\r?\n/).forEach((line) => {
      // Ignore comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) return;
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove surrounding quotes if they exist
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
}

// Load environment configurations
loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Use SERVICE_ROLE_KEY if available for administrative bypass, fallback to publishable key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL and Key are required. Please configure .env.local');
  process.exit(1);
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Error: Cloudinary credentials are required. Please configure .env.local');
  process.exit(1);
}

// Configure Cloudinary Node SDK
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

const supabase = createClient(supabaseUrl, supabaseKey);

// Download helper to fetch image from URL to local disk
function downloadImage(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    http.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: Status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log('🚀 Starting Cloudinary Image Migration...');
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE ACTIVE - No changes will be written to database or Cloudinary.\n');
  }

  try {
    // 1. Fetch all perfumes
    const { data: perfumes, error: fetchError } = await supabase
      .from('perfumes')
      .select('id, name, brand, image_url, user_id');

    if (fetchError) {
      throw fetchError;
    }

    if (!perfumes || perfumes.length === 0) {
      console.log('✨ No perfumes found in the database. Nothing to migrate.');
      return;
    }

    console.log(`📋 Found ${perfumes.length} total perfume records. Checking image URLs...`);
    
    // Filter records that have a supabase image url
    const legacyRecords = perfumes.filter(p => {
      const url = p.image_url || '';
      return url.includes('supabase.co') && !url.includes('res.cloudinary.com');
    });

    if (legacyRecords.length === 0) {
      console.log('✅ All perfume images have already been migrated! Zero legacy Supabase URLs detected.');
      return;
    }

    console.log(`🔍 Identified ${legacyRecords.length} records that need to be migrated to Cloudinary.\n`);

    // Create temp directory for downloading images
    const tempDir = path.join(process.cwd(), '.temp_migration');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < legacyRecords.length; i++) {
      const perfume = legacyRecords[i];
      const name = perfume.name || 'Unnamed Perfume';
      const brand = perfume.brand || 'Unknown Brand';
      const legacyUrl = perfume.image_url!;
      const userId = perfume.user_id || 'system';

      console.log(`[${i + 1}/${legacyRecords.length}] Processing "${name}" by ${brand}...`);
      console.log(`   Supabase URL: ${legacyUrl}`);

      if (isDryRun) {
        console.log(`   [Dry Run] Would download from Supabase, upload to Cloudinary under folder "scentboxd/bottles/${userId}", and update DB.`);
        successCount++;
        continue;
      }

      // Generate a temporary local file path
      const ext = legacyUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const tempFilePath = path.join(tempDir, `temp_${perfume.id}.${ext}`);

      try {
        // A. Download file locally
        await downloadImage(legacyUrl, tempFilePath);

        // B. Upload directly to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
          folder: `scentboxd/bottles/${userId}`,
          overwrite: true,
        });

        const cloudinaryUrl = uploadResult.secure_url;
        console.log(`   Uploaded! Cloudinary URL: ${cloudinaryUrl}`);

        // C. Update database row
        const { error: updateError } = await supabase
          .from('perfumes')
          .update({ image_url: cloudinaryUrl })
          .eq('id', perfume.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`   ✅ Database row updated successfully.`);
        successCount++;

      } catch (err: unknown) {
        console.error(`   ❌ Failed to migrate perfume ID ${perfume.id}:`, err instanceof Error ? err.message : String(err));
        failCount++;
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }

    // Clean up temp folder
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }

    console.log('\n================================================');
    console.log('🏁 Migration process completed!');
    console.log(`   Successful migrations: ${successCount}`);
    console.log(`   Failed migrations: ${failCount}`);
    console.log('================================================');

  } catch (err: unknown) {
    console.error('❌ Critical migration error:', err);
  }
}

run();
