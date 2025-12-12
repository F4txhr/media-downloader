'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { aio } = require('btch-downloader');

function logDebug(label, data) {
  try {
    // Log sederhana ke console (akan muncul di log Vercel)
    console.log('[download-api]', label, JSON.stringify(data));
  } catch (e) {
    console.log('[download-api]', label, data);
  }
}

const ALLOWED_HOST_SUFFIXES = [
  'instagram.com',
  'cdninstagram.com',
  'fbcdn.net',
  'facebook.com',
  'twitter.com',
  'x.com',
  'twimg.com',
  'tiktok.com',
  'tiktokcdn.com',
  'youtube.com',
  'youtu.be',
  'ytimg.com',
  'reddit.com',
  'redd.it',
  'redditmedia.com',
  'linkedin.com',
  'snapchat.com',
  'cdn.snapchat.com',
  'mediafire.com',
  'capcut.com',
  'drive.google.com',
  'google.com',
  'pin.it',
  'pinterest.com',
  'douyin.com',
  'xhslink.com',
  'xiaohongshu.com',
  'snackvideo.com',
  's.snackvideo.com',
  'icocofun.com',
  'spotify.com',
  'open.spotify.com',
  'soundcloud.com',
  'threads.net'
];

function isAllowedHost(hostname) {
  return ALLOWED_HOST_SUFFIXES.some((suffix) => {
    return hostname === suffix || hostname.endsWith('.' + suffix);
  });
}

function sendError(res, statusCode, message, extra) {
  logDebug('error', { statusCode, message, extra });
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      ok: false,
      error: message
    })
  );
}

function getSafeFilename(targetUrl, remoteHeaders) {
  const disposition = remoteHeaders['content-disposition'];
  if (typeof disposition === 'string') {
    // Very small best-effort parser for filename=\"...\"
    const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\\";]+)/i);
    if (match && match[1]) {
      const raw = match[1].trim();
      const decoded = decodeURIComponent(raw.replace(/['"]/g, ''));
      if (decoded) {
        return decoded.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'media-download';
      }
    }
  }

  try {
    const urlObj = new URL(targetUrl);
    const pathname = urlObj.pathname || '';
    const lastSegment = pathname.split('/').filter(Boolean).pop();
    if (lastSegment) {
      const sanitized = lastSegment.replace(/[^\w.\-]+/g, '_').slice(0, 80);
      if (sanitized) {
        return sanitized;
      }
    }
  } catch (_) {
    // fall through to default
  }

  return 'media-download';
}

// Cari URL media pertama dari struktur JSON btch-downloader (sangat generik)
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
    const preferredKeys = ['download', 'download_url', 'url', 'link', 'href'];
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

async function handleWithBtch(targetUrl, res, options) {
  const type = (options && options.type) || 'video';
  const quality = (options && options.quality) || 'auto';

  logDebug('btch:start', { targetUrl, type, quality });

  let data;
  try {
    data = await aio(targetUrl);
  } catch (err) {
    sendError(res, 502, 'Gagal memproses URL dengan btch-downloader.', {
      stage: 'btchRequest',
      message: err && err.message
    });
    return true;
  }

  logDebug('btch:raw', {
    keys: data && typeof data === 'object' ? Object.keys(data) : typeof data,
    sample:
      data && typeof data === 'object'
        ? (Array.isArray(data.result) && data.result[0]) ||
          (Array.isArray(data.data) && data.data[0]) ||
          null
        : null
  });

  const mediaUrl =
    (data && typeof data === 'object' && findFirstMediaUrl(data)) || findFirstMediaUrl(data);

  if (!mediaUrl) {
    sendError(res, 502, 'Tidak dapat menemukan media yang bisa diunduh dari URL tersebut.', {
      stage: 'btchNoMedia'
    });
    return true;
  }

  logDebug('btch:mediaUrl', { mediaUrl });

  // Stream mediaUrl ke client, mirip proxyRequest tapi untuk URL final ini.
  proxyRequest(mediaUrl, res, 4, options);
  return true;
}

function proxyRequest(targetUrl, res, remainingRedirects, options) {
  logDebug('proxy:start', { targetUrl, remainingRedirects, options });

  if (remainingRedirects <= 0) {
    sendError(res, 502, 'Terlalu banyak redirect dari server tujuan.', {
      stage: 'redirectLimit'
    });
    return;
  }

  let urlObj;
  try {
    urlObj = new URL(targetUrl);
  } catch (e) {
    sendError(res, 400, 'URL tujuan tidak valid.', {
      stage: 'parseTargetUrl',
      message: e && e.message
    });
    return;
  }

  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    sendError(res, 400, 'Hanya protokol http dan https yang didukung.', {
      stage: 'invalidProtocol',
      protocol: urlObj.protocol
    });
    return;
  }

  if (!isAllowedHost(urlObj.hostname)) {
    sendError(
      res,
      400,
      'Host tidak didukung. Hanya beberapa domain media sosial populer yang diizinkan.',
      { stage: 'hostNotAllowed', hostname: urlObj.hostname }
    );
    return;
  }

  const client = urlObj.protocol === 'https:' ? https : http;

  const remoteReq = client.get(urlObj.toString(), (remoteRes) => {
    const statusCode = remoteRes.statusCode || 0;
    logDebug('proxy:remoteResponse', { statusCode, headers: remoteRes.headers });

    // Tangani redirect (misalnya ke CDN)
    if (statusCode >= 300 && statusCode < 400 && remoteRes.headers.location) {
      let nextUrl;
      try {
        nextUrl = new URL(remoteRes.headers.location, urlObj);
      } catch (e) {
        sendError(res, 502, 'Redirect dari server tujuan tidak valid.', {
          stage: 'redirectParse',
          message: e && e.message
        });
        return;
      }

      proxyRequest(nextUrl.toString(), res, remainingRedirects - 1, options);
      return;
    }

    if (statusCode >= 400) {
      sendError(
        res,
        502,
        'Gagal mengambil konten dari URL yang diberikan (kode: ' + statusCode + ').',
        { stage: 'remoteStatus', statusCode }
      );
      return;
    }

    const contentType = remoteRes.headers['content-type'] || 'application/octet-stream';
    const filename = getSafeFilename(targetUrl, remoteRes.headers);

    logDebug('proxy:responseHeaders', { filename, contentType });

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="' + filename.replace(/"/g, '') + '"'
    );
    res.setHeader('Cache-Control', 'no-store');

    remoteRes.on('error', (err) => {
      if (!res.headersSent) {
        sendError(res, 502, 'Terjadi kesalahan saat mengalirkan data dari server tujuan.', {
          stage: 'remoteStreamError',
          message: err && err.message
        });
      } else {
        try {
          res.destroy();
        } catch (_) {
          // ignore
        }
      }
    });

    remoteRes.pipe(res);
  });

  remoteReq.on('error', (err) => {
    if (!res.headersSent) {
      sendError(res, 502, 'Tidak dapat terhubung ke URL yang diberikan.', {
        stage: 'requestError',
        message: err && err.message
      });
    } else {
      try {
        res.destroy(err);
      } catch (_) {
        // ignore
      }
    }
  });

  remoteReq.setTimeout(25000, () => {
    logDebug('proxy:timeout', { targetUrl });
    remoteReq.destroy(new Error('Request timeout'));
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendError(res, 405, 'Gunakan metode GET untuk mengunduh media.', { stage: 'method' });
    return;
  }

  const host = req.headers.host || 'localhost';
  let incomingUrl;

  try {
    incomingUrl = new URL(req.url, 'http://' + host);
  } catch (e) {
    sendError(res, 400, 'Permintaan tidak valid.', {
      stage: 'parseIncomingUrl',
      message: e && e.message,
      rawUrl: req.url
    });
    return;
  }

  const target = incomingUrl.searchParams.get('url');
  const type = (incomingUrl.searchParams.get('type') || 'video').toLowerCase();
  const quality = (incomingUrl.searchParams.get('quality') || 'auto').toLowerCase();

  logDebug('request:parsed', {
    url: target,
    type,
    quality,
    pathname: incomingUrl.pathname
  });

  if (!target) {
    sendError(res, 400, 'Parameter "url" wajib diisi.', { stage: 'missingUrl' });
    return;
  }

  // Coba dulu dengan btch-downloader (mencakup banyak platform).
  try {
    const handled = await handleWithBtch(target, res, { type, quality });
    if (handled) {
      return;
    }
  } catch (err) {
    logDebug('btch:unhandledError', { message: err && err.message });
    // fallback ke proxy biasa di bawah
  }

  proxyRequest(target, res, 4, { type, quality });
};