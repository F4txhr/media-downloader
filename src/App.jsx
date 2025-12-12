import React from 'react';

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
    // abaikan error parsing, akan dianggap auto
  }

  return { platform: 'auto', label: null };
}

const QUALITY_OPTIONS_VIDEO = [
  { value: 'auto', label: 'Auto (terbaik tersedia)' },
  { value: '360', label: '360p' },
  { value: '480', label: '480p' },
  { value: '720', label: '720p HD' },
  { value: '1080', label: '1080p Full HD' },
  { value: '1440', label: '1440p' },
  { value: '2160', label: '2160p 4K' }
];

const QUALITY_OPTIONS_AUDIO = [
  { value: 'auto', label: 'Auto (kualitas terbaik)' },
  { value: 'high', label: 'Tertinggi' },
  { value: 'medium', label: 'Sedang' },
  { value: 'low', label: 'Paling hemat data' }
];

function App() {
  const [url, setUrl] = React.useState('');
  const [detected, setDetected] = React.useState({ platform: 'auto', label: null });
  const [mediaType, setMediaType] = React.useState('video');
  const [quality, setQuality] = React.useState('auto');
  const [status, setStatus] = React.useState('');
  const [statusType, setStatusType] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [urlTouched, setUrlTouched] = React.useState(false);

  React.useEffect(() => {
    try {
      const savedUrl = window.localStorage.getItem('smd:url');
      const savedMediaType = window.localStorage.getItem('smd:type');
      const savedQuality = window.localStorage.getItem('smd:quality');
      if (savedUrl) {
        setUrl(savedUrl);
        setUrlTouched(true);
        setDetected(detectPlatform(savedUrl));
      }
      if (savedMediaType) {
        setMediaType(savedMediaType);
      }
      if (savedQuality) {
        setQuality(savedQuality);
      }
    } catch {
      // abaikan jika localStorage tidak tersedia
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem('smd:url', url);
      window.localStorage.setItem('smd:type', mediaType);
      window.localStorage.setItem('smd:quality', quality);
    } catch {
      // abaikan
    }
  }, [url, mediaType, quality]);

  function setStatusMessage(message, type) {
    setStatus(message || '');
    setStatusType(type || '');
  }

  function handleUrlChange(event) {
    const value = event.target.value;
    setUrl(value);
    if (!urlTouched) {
      setUrlTouched(true);
    }

    const detection = detectPlatform(value);
    setDetected(detection);
  }

  function handleMediaTypeChange(event) {
    setMediaType(event.target.value);
  }

  function handleQualityChange(event) {
    setQuality(event.target.value);
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

  async function handleSubmit(event) {
    event.preventDefault();

    const rawUrl = (url || '').trim();
    if (!rawUrl) {
      setStatusMessage('Mohon masukkan URL terlebih dahulu.', 'error');
      return;
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
      if (!/^https?:$/.test(parsed.protocol)) {
        setStatusMessage('URL harus diawali dengan http:// atau https://', 'error');
        return;
      }
    } catch {
      setStatusMessage('URL tidak valid. Coba periksa kembali.', 'error');
      return;
    }

    const btch = window.btch;
    if (!btch) {
      setStatusMessage('Library btch-downloader belum dimuat. Coba muat ulang halaman.', 'error');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Menghubungi layanan downloader…', 'info');

    try {
      // Gunakan aio (auto detect) seperti di dokumentasi btch
      const data = await btch.aio(rawUrl);

      if (!data || typeof data !== 'object') {
        setStatusMessage('Respon downloader tidak dikenali.', 'error');
        setIsSubmitting(false);
        return;
      }

      if (data.status === false) {
        const msg = data.mess || data.message || 'Layanan downloader menolak URL ini.';
        setStatusMessage(String(msg), 'error');
        setIsSubmitting(false);
        return;
      }

      // Tentukan akar pencarian berdasarkan pola umum dari docs:
      // - Untuk YouTube, mp4/mp3 ada di field khusus
      let rootForSearch = data;
      if (data.mp4 && mediaType !== 'audio') {
        rootForSearch = data.mp4;
      } else if (data.mp3 && mediaType === 'audio') {
        rootForSearch = data.mp3;
      } else if (Array.isArray(data.result) && data.result.length) {
        rootForSearch = data.result;
      } else if (Array.isArray(data.data) && data.data.length) {
        rootForSearch = data.data;
      }

      const mediaUrl = findFirstMediaUrl(rootForSearch);

      if (!mediaUrl) {
        setStatusMessage(
          'Tidak dapat menemukan media yang bisa diunduh dari URL ini. Coba URL lain.',
          'error'
        );
        setIsSubmitting(false);
        return;
      }

      if (mediaUrl === rawUrl) {
        setStatusMessage(
          'Downloader hanya mengembalikan URL asal, tidak ada link media langsung. Coba URL lain.',
          'error'
        );
        setIsSubmitting(false);
        return;
      }

      const title = typeof data.title === 'string' && data.title.trim().length > 0
        ? data.title.trim()
        : 'media-download';

      const params = new URLSearchParams({
        mediaUrl,
        filename: title
      });

      // Arahkan ke Cloudflare Worker untuk mengunduh file
      window.location.href =
        'https://downloader.dongtelo75.workers.dev/?' + params.toString();

      window.setTimeout(() => {
        setIsSubmitting(false);
        setStatusMessage(
          'Jika unduhan belum dimulai, pastikan URL valid, konten tidak privat, dan didukung oleh layanan ini.',
          'info'
        );
      }, 5000);
    } catch (err) {
      setStatusMessage(
        'Terjadi kesalahan saat menghubungi layanan downloader. Coba lagi beberapa saat.',
        'error'
      );
      setIsSubmitting(false);
    }
  }

  const showUrlError =
    urlTouched &&
    url.trim().length > 0 &&
    statusType === 'error' &&
    status.toLowerCase().includes('url');

  const qualityOptions = mediaType === 'audio' ? QUALITY_OPTIONS_AUDIO : QUALITY_OPTIONS_VIDEO;

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-pill-row">
            <span className="hero-pill">React · Vercel · Downloader Media Sosial</span>
          </div>
          <h1>Unduh Media Sosial</h1>
          <p>
            Tempel link dari media sosial favorit Anda dan unduh foto atau video dengan
            pengalaman yang halus dan responsif.
          </p>
          <p className="hero-note">
            Gunakan hanya untuk konten yang Anda miliki atau telah mendapat izin untuk
            diunduh.
          </p>
        </div>
      </header>

      <main className="main">
        <section className="card card-main">
          <h2>Masukkan URL Media</h2>
          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">URL Konten</span>
              <input
                value={url}
                onChange={handleUrlChange}
                name="url"
                type="url"
                placeholder="Tempel link postingan, misalnya YouTube / Instagram / TikTok"
                autoComplete="off"
                inputMode="url"
                aria-invalid={showUrlError ? 'true' : 'false'}
              />
              {detected.label && (
                <span className="hint-subtext">
                  Platform terdeteksi otomatis: <strong>{detected.label}</strong>
                </span>
              )}
            </label>

            <label className="field">
              <span className="field-label">Jenis dan kualitas</span>
              <div className="field-row">
                <select
                  value={mediaType}
                  onChange={handleMediaTypeChange}
                  name="type"
                  aria-label="Pilih jenis konten yang akan diunduh"
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio saja</option>
                </select>
                <select
                  value={quality}
                  onChange={handleQualityChange}
                  name="quality"
                  aria-label="Pilih kualitas resolusi"
                >
                  {qualityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={!url.trim() || isSubmitting}
              >
                {isSubmitting ? 'Menyiapkan…' : 'Mulai Unduh'}
              </button>
              <span className="hint-subtext">
                File akan diunduh ke folder unduhan default browser Anda.
              </span>
            </div>

            <p
              className={
                'status-message' +
                (statusType === 'error' ? ' status-error' : '') +
                (statusType === 'info' ? ' status-info' : '')
              }
              aria-live="polite"
            >
              {status}
            </p>
          </form>

          <div className="platform-hints">
            <h3>Tips Cepat</h3>
            <ul>
              <li>Pastikan konten tidak bersifat privat atau hanya teman.</li>
              <li>Gunakan link langsung ke posting / video, bukan ke profil.</li>
              <li>Untuk YouTube, Anda dapat memilih jenis dan kualitas, sisanya akan otomatis.</li>
            </ul>
          </div>
        </section>

        <section className="card card-secondary">
          <h2>Catatan Hak Cipta</h2>
          <p>
            Aplikasi ini dimaksudkan untuk membantu Anda mengunduh konten yang Anda miliki
            sendiri atau yang Anda punya izin eksplisit untuk disimpan. Selalu hormati{' '}
            <strong>hak cipta</strong>, <strong>syarat layanan</strong>, dan privasi kreator.
          </p>
          <p className="secondary-footnote">
            Backend dijalankan sebagai fungsi serverless di Vercel pada endpoint{' '}
            <code>/api/download</code>, yang akan meneruskan file media langsung ke browser
            Anda.
          </p>
        </section>
      </main>

      <footer className="footer">
        <p>React + Vercel · Downloader media sosial tanpa konfigurasi backend tambahan.</p>
      </footer>
    </div>
  );
}

export default App;