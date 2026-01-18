import fs from 'fs';
import path from 'path';
import { createAdminClient } from '../lib/supabase/server';

async function uploadLogos() {
  console.log('Initializing upload...');
  
  // Verify env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
  }

  const supabase = createAdminClient();
  const bucketName = 'logos';

  // Check if bucket exists, if not create it
  console.log(`Checking bucket '${bucketName}'...`);
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  const bucketExists = buckets.find(b => b.name === bucketName);
  if (!bucketExists) {
    console.log(`Bucket '${bucketName}' not found. Creating...`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
    });
    if (createError) {
      console.error('Error creating bucket:', createError);
      return;
    }
    console.log(`Bucket '${bucketName}' created.`);
  } else {
    console.log(`Bucket '${bucketName}' already exists.`);
  }

  const publicDir = path.join(process.cwd(), 'public');
  const files = [
    'cau.png',
    'cmu.jpg',
    'ncu.png',
    'ucb.png',
    'stanford.jpg',
    'mit.svg',
    'nju.png',
    'carnegie-mellon.jpg',
    'uc-berkeley.png',
    'cau-kiel.png'
  ];

  for (const file of files) {
    const filePath = path.join(publicDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const fileContent = fs.readFileSync(filePath);
    const fileExt = path.extname(file).substring(1);
    let contentType = 'application/octet-stream';
    if (fileExt === 'png') contentType = 'image/png';
    else if (fileExt === 'jpg' || fileExt === 'jpeg') contentType = 'image/jpeg';
    else if (fileExt === 'svg') contentType = 'image/svg+xml';

    console.log(`Uploading ${file}...`);
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(file, fileContent, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error(`Error uploading ${file}:`, error);
    } else {
      console.log(`Uploaded ${file} successfully.`);
      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(file);
      console.log(`Public URL: ${publicUrl}`);
    }
  }
}

uploadLogos().catch(e => {
  console.error('Script failed:', e);
});
