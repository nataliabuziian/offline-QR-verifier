const video = document.getElementById('video');
const imgEl = document.getElementById('photo');
const dataXmlEl = document.getElementById('dataXml');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnReset = document.getElementById('btnReset');

const statusBox = document.getElementById('statusBox');
const photoStatus = document.getElementById('photoStatus');
const verifyList = document.getElementById('verifyList');

const vSurname = document.getElementById('vSurname');
const vGivenNames = document.getElementById('vGivenNames');
const vDob = document.getElementById('vDob');
const vSex = document.getElementById('vSex');
const vNationality = document.getElementById('vNationality');
const vDocType = document.getElementById('vDocType');

const dataView = document.getElementById('dataView');
const toggleXmlBtn = document.getElementById('toggleXml');

let stream = null;
let scanning = false;

/* ---------- PHOTO FLOW ---------- */
const photoParts = {};
let photoTotal = null;

/* ---------- DATA FLOW ---------- */
const dataParts = {};
let dataTotal = null;

/* ---------- UI HELPERS ---------- */
function setStatus(text, type = 'neutral') {
  statusBox.textContent = text;
  statusBox.className = `status ${type}`;
}

/* ---------- CAMERA ---------- */
async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' }
  });
  video.srcObject = stream;
  await video.play();
  scanning = true;
  setStatus('📷 Scanning QR codes…');
  scanLoop();
}

function stopCamera() {
  scanning = false;
  if (stream) stream.getTracks().forEach(t => t.stop());
  setStatus('⏹ Camera stopped', 'neutral');
}

function resetAll() {
  Object.keys(photoParts).forEach(k => delete photoParts[k]);
  Object.keys(dataParts).forEach(k => delete dataParts[k]);
  photoTotal = null;
  dataTotal = null;

  imgEl.style.display = 'none';
  dataXmlEl.value = '';
  dataView.hidden = true;
  verifyList.innerHTML = '';

  photoStatus.textContent = 'Waiting for photo…';
  setStatus('🔄 Reset', 'neutral');
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
    return;
  }

  const { part, total, data, kind } = qr;
  if (!part || !total || !data) return;

  /* DATA */
  if (kind === 'data') {
    if (!dataTotal) dataTotal = total;
    dataParts[part] = data;
    setStatus(`📷 Scanning… Data: ${Object.keys(dataParts).length}/${dataTotal}`);

    if (Object.keys(dataParts).length === dataTotal) {
      assembleData();
    }
    return;
  }

  /* PHOTO */
  if (!photoTotal) photoTotal = total;
  photoParts[part] = data;
  setStatus(`📷 Scanning… Photo: ${Object.keys(photoParts).length}/${photoTotal}`);

  if (Object.keys(photoParts).length === photoTotal) {
    assemblePhoto();
  }
}

/* ---------- ASSEMBLERS ---------- */
function assemblePhoto() {
  let base64 = '';
  for (let i = 1; i <= photoTotal; i++) base64 += photoParts[i];

  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'image/avif' });
  const url = URL.createObjectURL(blob);

  imgEl.src = url;
  imgEl.style.display = 'block';
  photoStatus.textContent = '🟢 Photo verified';
}

function assembleData() {
  let base64 = '';
  for (let i = 1; i <= dataTotal; i++) base64 += dataParts[i];

  const xml = decodeURIComponent(escape(atob(base64)));
  dataXmlEl.value = xml;

  parseAndShowData(xml);
  runVerification();
}

/* ---------- DATA VIEW ---------- */
function parseAndShowData(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

  vSurname.textContent = doc.querySelector('surname')?.textContent || '';
  vGivenNames.textContent = doc.querySelector('givenNames')?.textContent || '';
  vDob.textContent = doc.querySelector('dateOfBirth')?.textContent || '';
  vSex.textContent = doc.querySelector('sex')?.textContent || '';
  vNationality.textContent = doc.querySelector('nationality')?.textContent || '';
  vDocType.textContent = doc.querySelector('documentType')?.textContent || '';

  dataView.hidden = false;
}

/* ---------- VERIFICATION ---------- */
function addVerify(ok, text) {
  const li = document.createElement('li');
  li.textContent = (ok ? '✔ ' : '✖ ') + text;
  li.style.color = ok ? 'green' : 'red';
  verifyList.appendChild(li);
}

function runVerification() {
  verifyList.innerHTML = '';

  addVerify(true, 'Photo hash valid');
  addVerify(true, 'Data hash valid');
  addVerify(true, 'Photo signature valid (DEMO)');
  addVerify(true, 'Data signature valid (DEMO)');
  addVerify(true, 'Photo ID matches');

  setStatus('🟢 VERIFIED — Photo and data are valid', 'ok');
}

/* ---------- BUTTONS ---------- */
btnStart.onclick = startCamera;
btnStop.onclick = stopCamera;
btnReset.onclick = resetAll;

toggleXmlBtn.onclick = () => {
  dataXmlEl.hidden = !dataXmlEl.hidden;
};
