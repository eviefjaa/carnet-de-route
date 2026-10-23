// Réactions aux clics et formulaires des pages sociales (profil public, abonnements, publications)

import { state, currentTrip } from "./store.js";
import { render } from "./views/trip.js";
import { peopleList } from "./views/social.js";
import * as social from "./social.js";
import { toast } from "./toast.js";
import { go } from "./router.js";

// Exécute une action en ligne, avec un message clair si elle échoue
async function attempt(fn, failure) {
  try {
    await fn();
    return true;
  } catch {
    toast(failure);
    return false;
  } finally {
    render();
  }
}

export function onSocialClick(act, b) {
  switch (act) {
    case "open-publish":
      state.publishOpen = true;
      render();
      return true;
    case "close-publish":
      state.publishOpen = false;
      render();
      return true;
    case "follow":
      if (!state.profile) {
        toast("Créez d'abord votre profil public pour vous abonner.");
        go("profil");
        return true;
      }
      attempt(async () => {
        const status = await social.follow({ uid: b.dataset.uid, visibility: b.dataset.visibility });
        toast(status === "accepted" ? "Abonnement ajouté" : "Demande d'abonnement envoyée");
      }, "Abonnement impossible pour le moment. Vérifiez votre connexion.");
      return true;
    case "unfollow":
      attempt(() => social.unfollow(b.dataset.uid), "Impossible de se désabonner. Vérifiez votre connexion.");
      return true;
    case "accept-follower":
      attempt(() => social.acceptFollower(b.dataset.uid), "Impossible d'accepter. Vérifiez votre connexion.");
      return true;
    case "remove-follower":
      attempt(() => social.removeFollower(b.dataset.uid), "Impossible de retirer cette personne. Vérifiez votre connexion.");
      return true;
    case "delete-post":
      state.confirm = "post:" + b.dataset.post;
      render();
      return true;
    case "delete-post-yes":
      state.confirm = null;
      attempt(async () => {
        await social.deletePost(b.dataset.post);
        toast("Publication supprimée");
        go("profil");
      }, "Impossible de supprimer la publication. Vérifiez votre connexion.");
      return true;
    case "copy-link":
      navigator.clipboard.writeText(location.href).then(
        () => toast("Lien copié : vous pouvez le partager"),
        () => toast("Copiez l'adresse de la page pour la partager.")
      );
      return true;
  }
  return false;
}

export function onSocialSubmit(e) {
  const f = e.target;
  if (f.matches("[data-publish-form]")) {
    e.preventDefault();
    const t = currentTrip();
    const title = f.elements.title.value.trim();
    if (!t || !title) return true;
    attempt(async () => {
      const id = await social.publish(t, { title, visibility: f.elements.visibility.value });
      state.publishOpen = false;
      toast("Itinéraire publié");
      go("publication-" + id);
    }, "Publication impossible pour le moment. Vérifiez votre connexion.");
    return true;
  }
  if (f.matches("[data-profile-form]")) {
    e.preventDefault();
    const name = f.elements.name.value.trim();
    const handle = f.elements.handle.value.trim().toLowerCase().replace(/^@/, "");
    const bio = f.elements.bio.value.trim();
    if (!name) return toast("Indiquez votre nom."), true;
    if (!social.HANDLE_RE.test(handle)) return toast("Pseudo : 3 à 20 caractères parmi les lettres minuscules, chiffres, point et tiret bas."), true;
    social.saveProfile({ name, handle, bio, visibility: f.elements.visibility.value })
      .then(() => toast("Profil enregistré"))
      .catch((err) => toast(err.code === "handle-taken" ? "Ce pseudo est déjà pris : choisissez-en un autre." : "Enregistrement impossible. Vérifiez votre connexion."))
      .finally(render);
    return true;
  }
  return false;
}

export function onSocialChange(el) {
  if (el.dataset && el.dataset.postVisibility) {
    attempt(async () => {
      await social.setPostVisibility(el.dataset.postVisibility, el.value);
      toast(`Visible par : ${social.VISIBILITIES[el.value]}`);
    }, "Impossible de changer la visibilité. Vérifiez votre connexion.");
    return true;
  }
  return false;
}

// Recherche de personnes : résultats mis à jour pendant la saisie
let searchTimer = null;
export function onSocialInput(el) {
  if (el.id !== "peopleSearch") return false;
  clearTimeout(searchTimer);
  const box = document.getElementById("peopleResults");
  const q = el.value;
  if (q.trim().replace(/^@/, "").length < 2) {
    box.innerHTML = "";
    return true;
  }
  searchTimer = setTimeout(async () => {
    try {
      const list = await social.searchProfiles(q);
      if (el.value === q) box.innerHTML = peopleList(list, "Aucune personne trouvée.");
    } catch {
      box.innerHTML = `<p class="note">Recherche impossible pour le moment.</p>`;
    }
  }, 300);
  return true;
}
