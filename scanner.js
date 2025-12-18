const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const imgEl = document.getElementById('photo');
const dataXmlEl = document.getElementById('dataXml');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnReset = document.getElementById('btnReset');

let stream = null;
let scanning = false;

/* ---------- PHOTO FLOW (UNCHANGED) ---------- */
const photoParts = {};
let photoTotal = null;

/* ---------- DATA FLOW (NEW) ---------- */
const dataParts = {};
let dataTotal = null;

/* ---------- CAMERA ---------- */
async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' }
  });
  video.srcObject = stream;
  await video.play();
  scanning = true;
  statusEl.textContent = '📷 Camera started';
  scanLoop();
}

function stopCamera() {
  scanning = false;
  if (stream) stream.getTracks().forEach(t => t.stop());
  statusEl.textContent = '⏹ Camera stopped';
}

function resetAll() {
  Object.keys(photoParts).forEach(k => delete photoParts[k]);
  Object.keys(dataParts).forEach(k => delete dataParts[k]);
  photoTotal = null;
  dataTotal = null;
  imgEl.style.display = 'none';
  dataXmlEl.value = '';
  statusEl.textContent = '🔄 Reset';
}

/* ---------- SCAN LOOP ---------- */
async function scanLoop() {
  if (!scanning) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);

    if (code) {
      handleQR(code.data);
      await new Promise(r => setTimeout(r, 700));
    }
  }
  requestAnimationFrame(scanLoop);
}

/* ---------- QR HANDLER ---------- */
function handleQR(text) {
  let qr;
  try {
    qr = JSON.parse(text);
  } catch {
    statusEl.textContent = '❌ Not JSON';
    return;
  }

  const { part, total, data, kind } = qr;

  if (!part || !total || !data) {
    statusEl.textContent = '❌ Invalid QR';
    return;
  }

  /* ----- DATA XML ----- */
  if (kind === 'data') {
    if (!dataTotal) dataTotal = total;
    dataParts[part] = data;

    statusEl.textContent = `🧾 Data: ${Object.keys(dataParts).length}/${dataTotal}`;

    if (Object.keys(dataParts).length === dataTotal) {
      assembleData();
    }
    return;
  }

  /* ----- PHOTO (OLD LOGIC) ----- */
  if (!photoTotal) photoTotal = total;
  photoParts[part] = data;

  statusEl.textContent = `📷 Photo: ${Object.keys(photoParts).length}/${photoTotal}`;

  if (Object.keys(photoParts).length === photoTotal) {
    assemblePhoto();
  }
}

/* ---------- ASSEMBLERS ---------- */
function assemblePhoto() {
  let base64 = '';
  for (let i = 1; i <= photoTotal; i++) {
    base64 += photoParts[i];
  }

  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'image/avif' });
  const url = URL.createObjectURL(blob);

  imgEl.src = url;
  imgEl.style.display = 'block';

  statusEl.textContent = '✅ Photo reconstructed';
}

function assembleData() {
  let base64 = '';
  for (let i = 1; i <= dataTotal; i++) {
    base64 += dataParts[i];
  }

  const xml = decodeURIComponent(escape(atob(base64)));
  dataXmlEl.value = xml;

  statusEl.textContent = '✅ Data XML reconstructed';
}

/* ---------- BUTTONS ---------- */
btnStart.onclick = startCamera;
btnStop.onclick = stopCamera;
btnReset.onclick = resetAll;
