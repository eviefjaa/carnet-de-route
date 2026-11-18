// Chemins vers les boutons rangés par l'allègement de la page d'un voyage :
// « + Étape » / « + Trajet » derrière le petit « + » entre deux éléments, actions de l'en-tête
// dans le menu « ⋯ », budget replié en une ligne.

// act : "add-stop" ou "add-leg" ; pos : position dans l'itinéraire (le « + » est ouvert s'il y en a un)
export async function clickInsert(page, act, pos) {
  const plus = await page.$(`[data-act="insert-open"][data-pos="${pos}"]`);
  if (plus && await plus.isVisible()) {
    await plus.click();
    await page.waitForSelector(`#ins-${pos} [data-act="${act}"]`, { visible: true });
  }
  await page.click(`[data-act="${act}"][data-pos="${pos}"]`);
}

// sel : choix du menu « ⋯ », ex. '[data-act="open-publish"]' ou '[data-act="set-kind"][data-kind="road"]'
export async function clickMore(page, sel) {
  await page.waitForSelector("#tripMoreBtn");
  await page.$eval("#tripMoreBtn", (b) => b.scrollIntoView({ block: "center" }));
  if (!(await page.$eval("#tripMoreBtn", (b) => b.getAttribute("aria-expanded") === "true"))) await page.click("#tripMoreBtn");
  await page.waitForSelector(`#tripMore ${sel}`, { visible: true });
  await page.click(`#tripMore ${sel}`);
}

// Budget déplié (devise, tableau)
export async function openBudget(page) {
  await page.waitForSelector(".trip-budget .b-toggle");
  if (await page.$eval(".trip-budget .b-toggle", (b) => b.getAttribute("aria-expanded") === "false")) {
    await page.click(".trip-budget .b-toggle");
    await page.waitForSelector(".budget-table");
  }
}
