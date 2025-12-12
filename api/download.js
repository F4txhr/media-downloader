'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const ytdl = require('@distube/ytdl-core');

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
  'cdn.snapchat.com'
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

function detectPlatform(hostname) {
  const host = (hostname || '').toLowerCase();

  if (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('ytimg.com')) {
    return 'youtube';
  }

  // Platform lain bisa ditambahkan di sini di masa depan.
  return 'generic';
}

async function handleYouTubeDownload(targetUrl, res, options) {
  const type = (options && options.type) || 'video';
  const quality = (options && options.quality) || 'auto';

  logDebug('youtube:start', { targetUrl, type, quality });

  let info;
  try {
    info = await ytdl.getInfo(targetUrl);
  } catch (err) {
    sendError(res, 502, 'Gagal mengambil informasi video YouTube.', {
      stage: 'getInfo',
      message: err && err.message
    });
    return;
  }

  const isAudio = type === 'audio';
  let chosenFormat;

  if (isAudio) {
    let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    logDebug('youtube:audioFormats:count', { count: audioFormats.length });

    if (!audioFormats.length) {
      sendError(res, 502, 'Stream audio tidak tersedia untuk konten ini.', {
        stage: 'audioFormatsEmpty'
      });
      return;
    }

    audioFormats = audioFormats.filter((f) => typeof f.audioBitrate === 'number');
    if (!audioFormats.length) {
      audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    }

    if (!audioFormats.length) {
      sendError(res, 502, 'Stream audio tidak tersedia untuk konten ini.', {
        stage: 'audioFormatsNoBitrate'
      });
      return;
    }

    audioFormats.sort((a, b) => {
      const aBit = a.audioBitrate || 0;
      const bBit = b.audioBitrate || 0;
      return aBit - bBit;
    });

    if (quality === 'low') {
      chosenFormat = audioFormats[0];
    } else if (quality === 'medium') {
      chosenFormat = audioFormats[Math.floor(audioFormats.length / 2)];
    } else {
      chosenFormat = audioFormats[audioFormats.length - 1];
    }

    logDebug('youtube:audio:chosen', {
      itag: chosenFormat && chosenFormat.itag,
      bitrate: chosenFormat && chosenFormat.audioBitrate
    });
  } else {
    let videoFormats = info.formats.filter((f) => f.hasVideo && f.hasAudio);
    if (!videoFormats.length) {
      videoFormats = info.formats.filter((f) => f.hasVideo);
    }
    logDebug('youtube:videoFormats:count', { count: videoFormats.length });

    if (!videoFormats.length) {
      sendError(res, 502, 'Stream video tidak tersedia untuk konten ini.', {
        stage: 'videoFormatsEmpty'
      });
      return;
    }

    const desiredHeight = parseInt(quality, 10);
    if (!Number.isNaN(desiredHeight)) {
      const exact = videoFormats.filter((f) => f.height === desiredHeight);
      if (exact.length) {
        chosenFormat = exact[0];
      } else {
        const lowerOrEqual = videoFormats
          .filter((f) => typeof f.height === 'number' && f.height <= desiredHeight)
          .sort((a, b) => (b.height || 0) - (a.height || 0));
        if (lowerOrEqual.length) {
          chosenFormat = lowerOrEqual[0];
        }
      }
    }

    if (!chosenFormat) {
      const withHeight = videoFormats.filter((f) => typeof f.height === 'number');
      if (withHeight.length) {
        withHeight.sort((a, b) => (b.height || 0) - (a.height || 0));
        chosenFormat = withHeight[0];
      } else {
        chosenFormat = videoFormats[0];
      }
    }

    logDebug('youtube:video:chosen', {
      itag: chosenFormat && chosenFormat.itag,
      height: chosenFormat && chosenFormat.height,
      mimeType: chosenFormat && chosenFormat.mimeType
    });
  }

  if (!chosenFormat) {
    sendError(res, 502, 'Tidak dapat menentukan format unduhan yang sesuai.', {
      stage: 'chosenFormatNull'
    });
    return;
  }

  const filenameBase = getSafeFilename(targetUrl, {}) || 'media-download';
  const container = chosenFormat.container || (isAudio ? 'mp3' : 'mp4');
  const safeBase = filenameBase.replace(/\.[^.]+$/, '');
  const filename = (safeBase || 'media-download') + '.' + container.replace(/[^a-z0-9]/gi, '');

  logDebug('youtube:responseHeaders', {
    filename,
    mimeType: chosenFormat.mimeType
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', chosenFormat.mimeType || (isAudio ? 'audio/mpeg' : 'video/mp4'));
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="' + filename.replace(/"/g, '') + '"'
  );
  res.setHeader('Cache-Control', 'no-store');

  const stream = ytdl(targetUrl, { format: chosenFormat });

  stream.on('error', (err) => {
    if (!res.headersSent) {
      sendError(res, 502, 'Terjadi kesalahan saat mengalirkan data dari YouTube.', {
        stage: 'streamError',
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

  stream.pipe(res);
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

  const platform = detectPlatform(urlObj.hostname);
  logDebug('proxy:platform', { hostname: urlObj.hostname, platform });

  if (platform === 'youtube') {
    handleYouTubeDownload(urlObj.toString(), res, options || {});
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

module.exports = (req, res) => {
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

  proxyRequest(target, res, 4, { type, quality });
};