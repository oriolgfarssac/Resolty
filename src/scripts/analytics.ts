type EventName = 'page_view' | 'cta_click' | 'form_start' | 'language_select';

export function track(event: EventName, lang: string) {
  if (document.body.dataset.analytics !== 'enabled') return;
  if (navigator.doNotTrack === '1' || Reflect.get(navigator, 'globalPrivacyControl') === true) return;
  void fetch('/api/events/', {
    method: 'POST',
    body: new URLSearchParams({ event, lang }),
    credentials: 'omit',
    keepalive: true,
  }).catch(() => {});
}
