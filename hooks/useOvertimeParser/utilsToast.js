export function showUniqueToastFactory(setToast) {
  const last = { msg: null, ts: 0 };

  return (type, message, duration = 6000) => {
    const now = Date.now();
    if (last.msg === message && now - last.ts < duration) return;
    last.msg = message;
    last.ts = now;
    setToast({ type, message });
    setTimeout(() => {
      setToast((cur) => (cur && cur.message === message ? null : cur));
    }, duration);
  };
}
