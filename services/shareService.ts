import html2canvas from 'html2canvas';

export async function captureCardAsImage(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create image'));
    }, 'image/png', 1.0);
  });
}

export async function shareCard(blob: Blob, designName: string): Promise<void> {
  const file = new File([blob], `${designName.toLowerCase().replace(/\s+/g, '-')}-zenspace.png`, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `${designName} — ZenSpace Design`,
      text: `Check out this design concept from ZenSpace`,
      files: [file],
    });
    return;
  }

  downloadBlob(blob, designName);
}

export async function downloadCard(blob: Blob, designName: string): Promise<void> {
  downloadBlob(blob, designName);
}

function downloadBlob(blob: Blob, designName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${designName.toLowerCase().replace(/\s+/g, '-')}-zenspace.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
