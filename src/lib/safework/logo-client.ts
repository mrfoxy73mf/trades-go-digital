const MAX_SOURCE_BYTES = 250_000;
const MAX_DATA_URL_LENGTH = 40_000;
export const SAFEWORK_LOGO_KEY = 'tgd-safework-logo-v1';

export function bindCompanyLogoUpload(form: HTMLFormElement) {
  const fileInput = form.querySelector<HTMLInputElement>('input[name="companyLogoFile"]');
  const valueInput = form.querySelector<HTMLInputElement>('input[name="logoDataUrl"]');
  const preview = form.querySelector<HTMLImageElement>('[data-company-logo-preview]');
  const status = form.querySelector<HTMLElement>('[data-company-logo-status]');
  if (!fileInput || !valueInput || !preview || !status) return;

  try {
    const saved = JSON.parse(localStorage.getItem(SAFEWORK_LOGO_KEY) || '{}');
    if (typeof saved.dataUrl === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/.test(saved.dataUrl) && saved.dataUrl.length <= MAX_DATA_URL_LENGTH) {
      valueInput.value = saved.dataUrl;
      preview.src = saved.dataUrl;
      preview.hidden = false;
      status.textContent = `Logo from Logo Maker ready${saved.name ? ` for ${saved.name}` : ''}. Choose another file to replace it.`;
    }
  } catch { localStorage.removeItem(SAFEWORK_LOGO_KEY); }

  fileInput.addEventListener('change', async () => {
    valueInput.value = '';
    preview.hidden = true;
    const file = fileInput.files?.[0];
    if (!file) { status.textContent = 'No logo selected.'; return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > MAX_SOURCE_BYTES) {
      fileInput.value = '';
      status.textContent = 'Use a PNG, JPG or WebP image smaller than 250 KB.';
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 360 / bitmap.width, 160 / bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const dataUrl = canvas.toDataURL('image/webp', .86);
      if (dataUrl.length > MAX_DATA_URL_LENGTH) throw new Error('compressed image is too large');
      valueInput.value = dataUrl;
      localStorage.setItem(SAFEWORK_LOGO_KEY, JSON.stringify({ dataUrl, name: '', savedAt: Date.now() }));
      preview.src = dataUrl;
      preview.hidden = false;
      status.textContent = 'Logo ready. It will appear at the top of every pack page.';
    } catch {
      fileInput.value = '';
      status.textContent = 'This image could not be prepared. Try a smaller PNG, JPG or WebP file.';
    }
  });
}
