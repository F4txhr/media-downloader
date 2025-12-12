'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

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
  'cdn.snapchat.com'
];

function isAllowedHost(hostname) {
  return ALLOWED_HOST_SUFFIXES.some((suffix) => {
    return hostname === suffix || hostname.endsWith('.' + suffix);
  });
}

function sendError(res, statusCode, message) {
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
    // Very small best-effort parser for filename="..."
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
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

function proxyRequest(targetUrl, res, remainingRedirects) {
  if (remainingRedirects <= 0) {
    sendError(res, 502, 'Terlalu banyak redirect dari server tujuan.');
    return;
  }

  let urlObj;
  try {
    urlObj = new URL(targetUrl);
  } catch (e) {
    sendError(res, 400, 'URL tujuan tidak valid.');
    return;
  }

  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    sendError(res, 400, 'Hanya protokol http dan https yang didukung.');
    return;
  }

  if (!isAllowedHost(urlObj.hostname)) {
    sendError(
      res,
      400,
      'Host tidak didukung. Hanya beberapa domain media sosial populer yang diizinkan.'
    );
    return;
  }

  const client = urlObj.protocol === 'https:' ? https : http;

  const remoteReq = client.get(urlObj.toString(), (remoteRes) => {
    const statusCode = remoteRes.statusCode || 0;

    // Tangani redirect (misalnya ke CDN)
    if (statusCode >= 300 && statusCode < 400 && remoteRes.headers.location) {
      let nextUrl;
      try {
        nextUrl = new URL(remoteRes.headers.location, urlObj);
      } catch (_) {
        sendError(res, 502, 'Redirect dari server tujuan tidak valid.');
        return;
      }

      proxyRequest(nextUrl.toString(), res, remainingRedirects - 1);
      return;
    }

    if (statusCode >= 400) {
      sendError(
        res,
        502,
        'Gagal mengambil konten dari URL yang diberikan (kode: ' + statusCode + ').'
      );
      return;
    }

    const contentType = remoteRes.headers['content-type'] || 'application/octet-stream';
    const filename = getSafeFilename(targetUrl, remoteRes.headers);

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="' + filename.replace(/"/g, '') + '"'
    );
    res.setHeader('Cache-Control', 'no-store');

    remoteRes.on('error', () => {
      if (!res.headersSent) {
        sendError(res, 502, 'Terjadi kesalahan saat mengalirkan data dari server tujuan.');
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
      sendError(res, 502, 'Tidak dapat terhubung ke URL yang diberikan.');
    } else {
      try {
        res.destroy(err);
      } catch (_) {
        // ignore
      }
    }
  });

  remoteReq.setTimeout(25000, () => {
    remoteReq.destroy(new Error('Request timeout'));
  });
}

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendError(res, 405, 'Gunakan metode GET untuk mengunduh media.');
    return;
  }

  const host = req.headers.host || 'localhost';
  let incomingUrl;

  try {
    incomingUrl = new URL(req.url, 'http://' + host);
  } catch (_) {
    sendError(res, 400, 'Permintaan tidak valid.');
    return;
  }

  const target = incomingUrl.searchParams.get('url');
  const platform = (incomingUrl.searchParams.get('platform') || 'auto').toLowerCase();

  if (!target) {
    sendError(res, 400, 'Parameter "url" wajib diisi.');
    return;
  }

  // Saat ini, parameter platform hanya informatif. Validasi dan logika tambahan
  // per-platform bisa ditambahkan di sini jika dibutuhkan di masa depan.
  if (!platform) {
    // default saja ke auto; ini hanya defensive.
  }

  proxyRequest(target, res, 4);
};