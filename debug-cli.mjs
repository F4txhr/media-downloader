#!/usr/bin/env node

// CLI sederhana untuk debugging alur btch-downloader + pemilihan mediaUrl.
// Pemakaian:
//   node debug-cli.mjs "https://youtu.be/..." [video|audio]
//
// Script ini:
// 1. Deteksi platform dari URL.
// 2. Memilih fungsi btch-downloader yang sesuai (youtube, ttdl, igdl, dll).
// 3. Memanggil fungsi tersebut dan menampilkan JSON hasilnya.
// 4. Memilih mediaUrl (mp4/mp3) dengan logika mirip frontend.
// 5. Mencoba melakukan request ke mediaUrl dan melaporkan status & header.

import {
  aio,
  ttdl,
  igdl,
  fbdown,
  twitter,
  youtube,
  mediafire,
  capcut,
  gdrive,
  pinterest,
  douyin,
  xiaohongshu,
  snackvideo,
  cocofun,
  spotify,
  soundcloud,
  threads,
  yts
} from 'btch-downloader';

const [, , rawUrl, rawType] = process.argv;

if (!rawUrl) {
  console.error('Pemakaian: node debug-cli.mjs "<url>" [video|audio]');
  process.exit(1);
}

const desiredType = (rawType || 'video').toLowerCase();

function detectPlatform(url) {
  if (!url) {
    return { platform: 'auto', label: null };
  }

  try {
    const { hostname } = new URL(url);
    const host = hostname.toLowerCase();

    if (host.includes('instagram.com') || host.includes('cdninstagram.com')) {
      return { platform: 'instagram', label: 'Instagram' };
    }
    if (host.includes('facebook.com') || host.includes('fbcdn.net')) {
      return { platform: 'facebook', label: 'Facebook' };
    }
    if (host.includes('twitter.com') || host.includes('x.com') || host.includes('twimg.com')) {
      return { platform: 'twitter', label: 'X (Twitter)' };
    }
    if (host.includes('tiktok.com')) {
      return { platform: 'tiktok', label: 'TikTok' };
    }
    if (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('ytimg.com')) {
      return { platform: 'youtube', label: 'YouTube' };
    }
    if (host.includes('reddit.com') || host.includes('redd.it') || host.includes('redditmedia.com')) {
      return { platform: 'reddit', label: 'Reddit' };
    }
    if (host.includes('linkedin.com')) {
      return { platform: 'linkedin', label: 'LinkedIn' };
    }
    if (host.includes('snapchat.com')) {
      return { platform: 'snapchat', label: 'Snapchat' };
    }
  } catch {
    // abaikan
  }

  return { platform: 'auto', label: null };
}

function pickBtchFn(url, detected) {
  const lower = (url || '').toLowerCase();

  if (detected.platform === 'youtube' || lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return youtube;
  }
  if (detected.platform === 'tiktok' || lower.includes('tiktok.com') || lower.includes('vt.tiktok.com')) {
    return ttdl;
  }
  if (detected.platform === 'instagram' || lower.includes('instagram.com')) {
    return igdl;
  }
  if (detected.platform === 'facebook' || lower.includes('facebook.com')) {
    return fbdown;
  }
  if (detected.platform === 'twitter' || lower.includes('twitter.com') || lower.includes('x.com')) {
    return twitter;
  }
  if (lower.includes('mediafire.com')) return mediafire;
  if (lower.includes('capcut.com')) return capcut;
  if (lower.includes('drive.google.com')) return gdrive;
  if (lower.includes('pin.it') || lower.includes('pinterest.com')) return pinterest;
  if (lower.includes('douyin.com')) return douyin;
  if (lower.includes('xhslink.com') || lower.includes('xiaohongshu.com')) return xiaohongshu;
  if (lower.includes('snackvideo.com') || lower.includes('s.snackvideo.com')) return snackvideo;
  if (lower.includes('icocofun.com')) return cocofun;
  if (lower.includes('spotify.com') || lower.includes('open.spotify.com')) return spotify;
  if (lower.includes('soundcloud.com')) return soundcloud;
  if (lower.includes('threads.net')) return threads;

  try {
    new URL(url);
    return aio;
  } catch {
    return yts;
  }
}

function findFirstMediaUrl(node) {
  if (!node) return null;

  if (typeof node === 'string') {
    if (/^https?:\/\//i.test(node)) {
      return node;
    }
    return null;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findFirstMediaUrl(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof node === 'object') {
    const preferredKeys = ['download', 'download_url', 'url', 'link', 'href', 'video', 'audio'];
    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        const found = findFirstMediaUrl(node[key]);
        if (found) return found;
      }
    }
    for (const value of Object.values(node)) {
      const found = findFirstMediaUrl(value);
      if (found) return found;
    }
  }

  return null;
}

async function main() {
  console.log('URL:', rawUrl);
  console.log('Tipe diinginkan:', desiredType);

  let parsed;
  try {
    parsed = new URL(rawUrl);
    if (!/^https?:$/.test(parsed.protocol)) {
      console.error('URL harus diawali http/https.');
      process.exit(1);
    }
  } catch (e) {
    console.error('URL tidak valid:', e.message);
    process.exit(1);
  }

  const detected = detectPlatform(rawUrl);
  console.log('Platform terdeteksi:', detected);

  const fn = pickBtchFn(rawUrl, detected);
  console.log('Fungsi btch yang dipakai:', fn.name || '<anon>');

  let data;
  try {
    data = await fn(rawUrl);
  } catch (err) {
    console.error('Gagal memanggil btch-downloader:', err && err.message ? err.message : err);
    process.exit(1);
  }

  console.log('\n=== JSON dari btch ===');
  console.dir(data, { depth: null });

  if (!data || typeof data !== 'object') {
    console.error('Respon bukan objek, tidak bisa dilanjutkan.');
    process.exit(1);
  }

  if (data.status === false) {
    console.error('btch status:false ->', data.mess || data.message || 'tidak ada pesan.');
    process.exit(1);
  }

  let rootForSearch = data;
  if (data.mp4 && desiredType !== 'audio') {
    rootForSearch = data.mp4;
  } else if (data.mp3 && desiredType === 'audio') {
    rootForSearch = data.mp3;
  } else if (Array.isArray(data.result) && data.result.length) {
    rootForSearch = data.result;
  } else if (Array.isArray(data.data) && data.data.length) {
    rootForSearch = data.data;
  }

  const mediaUrl = findFirstMediaUrl(rootForSearch);

  console.log('\n=== Hasil pemilihan mediaUrl ===');
  console.log('mediaUrl:', mediaUrl);

  if (!mediaUrl) {
    console.error('Tidak menemukan mediaUrl dalam JSON.');
    process.exit(1);
  }

  if (mediaUrl === rawUrl) {
    console.error('mediaUrl sama dengan URL asal, kemungkinan hanya mengembalikan halaman.');
    process.exit(1);
  }

  // Coba fetch mediaUrl hanya untuk melihat status & header (tanpa menyimpan file)
  try {
    const res = await fetch(mediaUrl, { method: 'GET' });
    console.log('\n=== Hasil fetch mediaUrl ===');
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Content-Length:', res.headers.get('content-length'));
  } catch (e) {
    console.error('Gagal fetch mediaUrl:', e.message);
  }
}

main().catch((e) => {
  console.error('Kesalahan tak terduga:', e && e.message ? e.message : e);
  process.exit(1);
});