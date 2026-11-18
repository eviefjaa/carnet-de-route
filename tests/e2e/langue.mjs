// Langue du navigateur imposée aux parcours (navigator.languages) : l'option --lang de Chrome
// est ignorée sur Mac, où la langue du système l'emporte. forceLang(browser, "fr-FR") s'applique
// à toutes les pages ouvertes ensuite, contextes séparés compris, et survit à page.emulate.
export function forceLang(browser, lang) {
  const accept = `${lang},${lang.split("-")[0]}`;
  const apply = async (page) => {
    const s = await page.createCDPSession();
    const setUa = async (ua) => s.send("Emulation.setUserAgentOverride", { userAgent: ua || (await browser.userAgent()), acceptLanguage: accept });
    await setUa();
    const emulate = page.emulate.bind(page);
    page.emulate = async (device) => { await emulate(device); await setUa(device && device.userAgent); };
    const setUserAgent = page.setUserAgent.bind(page);
    page.setUserAgent = async (ua, ...rest) => { await setUserAgent(ua, ...rest); await setUa(ua); };
    return page;
  };
  const wrap = (target) => {
    const newPage = target.newPage.bind(target);
    target.newPage = async () => apply(await newPage());
    return target;
  };
  wrap(browser);
  const createBrowserContext = browser.createBrowserContext.bind(browser);
  browser.createBrowserContext = async (...a) => wrap(await createBrowserContext(...a));
  return browser;
}
