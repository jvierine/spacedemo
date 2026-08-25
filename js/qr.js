const slug = location.pathname.replace(/\/+$/, '').split('/').at(-1) || 'index';
const canonical = slug === 'space' || slug === 'index'
  ? 'https://juha.no/space/'
  : `https://juha.no/space/${slug}/`;
const panel = document.createElement('a');
panel.className = 'qr-card';
panel.href = canonical;
panel.setAttribute('aria-label', `Open ${document.title} on a phone`);
const qrName = slug === 'space' ? 'index' : slug;
const qrSource = qrName === 'index' ? './qr/index.svg' : `../qr/${qrName}.svg`;
panel.innerHTML = `<img src="${qrSource}" alt="QR code for ${canonical}"><span>Open on phone</span>`;
(document.querySelector('.viewport') || document.querySelector('.landing-main') || document.body).append(panel);
