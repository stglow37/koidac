console.log('[KOIDAC background] service worker starting');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[KOIDAC background] onInstalled');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[KOIDAC background] onStartup');
});
