import React from 'react';

const PLATFORM_OPTIONS = [
  { value: 'auto', label: 'Deteksi otomatis' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'other', label: 'Lainnya' }
];

function detectPlatform(url) {
  if (!url) {
    return { platform: 'auto', label: null };
  }

  try {
    const { hostname } = new URL(url);
    const host = hostname.toLowerCase();

    if (host.includes('instagram.com') || host.includes('cdninstagram.com')) {
      return { platform: 'instagram', label: 'Instagram terdeteksi dari URL' };
    }
    if (host.includes('facebook.com') || host.includes('fbcdn.net')) {
      return { platform: 'facebook', label: 'Facebook terdeteksi dari URL' };
    }
    if (host.includes('twitter.com') || host.includes('x.com') || host.includes('twimg.com')) {
      return { platform: 'twitter', label: 'X (Twitter) terdeteksi dari URL' };
    }
    if (host.includes('tiktok.com')) {
      return { platform: 'tiktok', label: 'TikTok terdeteksi dari URL' };
    }
    if (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('ytimg.com')) {
      return { platform: 'youtube', label: 'YouTube terdeteksi dari URL' };
    }
    if (host.includes('reddit.com') || host.includes('redd.it') || host.includes('redditmedia.com')) {
      return { platform: 'reddit', label: 'Reddit terdeteksi dari URL' };
    }
    if (host.includes('linkedin.com')) {
      return { platform: 'linkedin', label: 'LinkedIn terdeteksi dari URL' };
    }
    if (host.includes('snapchat.com')) {
      return { platform: 'snapchat', label: 'Snapchat terdeteksi dari URL' };
    }
  } catch {
    // abaikan error parsing, akan dianggap auto
  }

  return { platform: 'auto', label: null };
}

function getPlatformLabel(value) {
  const found = PLATFORM_OPTIONS.find((p) => p.value === value);
  return found ? found.label : value;
}

function App() {
  const [url, setUrl] = React.useState('');
  const [platform, setPlatform] = React.useState('auto');
  const [detected, setDetected] = React.useState({ platform: 'auto', label: null });
  const [status, setStatus] = React.useState('');
  const [statusType, setStatusType] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [urlTouched, setUrlTouched] = React.useState(false);

  React.useEffect(() => {
    try {
      const savedUrl = window.localStorage.getItem('smd:url');
      const savedPlatform = window.localStorage.getItem('smd:platform');
      if (savedUrl) {
        setUrl(savedUrl);
        setUrlTouched(true);
        setDetected(detectPlatform(savedUrl));
      }
      if (savedPlatform) {
        setPlatform(savedPlatform);
      }
    } catch {
      // abaikan jika localStorage tidak tersedia
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem('smd:url', url);
      window.localStorage.setItem('smd:platform', platform);
    } catch {
      // abaikan
    }
  }, [url, platform]);

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

  function handlePlatformChange(event) {
    setPlatform(event.target.value);
  }

  function handleSubmit(event) {
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

    setIsSubmitting(true);
    setStatusMessage('Menyiapkan unduhan…', 'info');

    const effectivePlatform = platform === 'auto' && detected.platform !== 'auto'
      ? detected.platform
      : platform || 'auto';

    const params = new URLSearchParams({
      url: rawUrl,
      platform: effectivePlatform
    });

    window.location.href = '/api/download?' + params.toString();

    window.setTimeout(() => {
      setIsSubmitting(false);
      setStatusMessage(
        'Jika unduhan belum dimulai, pastikan URL valid, konten tidak privat, dan didukung oleh layanan ini.',
        'info'
      );
    }, 5000);
  }

  const showUrlError =
    urlTouched &&
    url.trim().length > 0 &&
    statusType === 'error' &&
    status.toLowerCase().includes('url');

  const showDetectedHint = detected.label && platform === 'auto';

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
              <span className="field-label">Pilih Platform</span>
              <div className="field-row">
                <select
                  value={platform}
                  onChange={handlePlatformChange}
                  name="platform"
                  aria-label="Pilih platform media sosial"
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {showDetectedHint && (
                  <span className="pill pill-soft">
                    {detected.label} ({getPlatformLabel(detected.platform)})
                  </span>
                )}
              </div>
            </label>

            <label className="field">
              <span className="field-label">URL Konten</span>
              <input
                value={url}
                onChange={handleUrlChange}
                name="url"
                type="url"
                placeholder="https://www.instagram.com/p/... atau https://www.youtube.com/watch?v=..."
                autoComplete="off"
                inputMode="url"
                aria-invalid={showUrlError ? 'true' : 'false'}
              />
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
              <li>Beberapa platform mungkin membatasi atau melindungi unduhan langsung.</li>
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