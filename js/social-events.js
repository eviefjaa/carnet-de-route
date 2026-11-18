// Réactions aux clics et formulaires des pages sociales (profil public, abonnements, publications)

import { state, currentTrip, createTrip } from "./store.js";
import { prefs, toggleFavoritePost, forgetFavoritePosts } from "./prefs.js";
import { tripFromPost } from "./fork.js";
import { countryByCode } from "./data/countries.js";
import { render } from "./views/trip.js";
import { peopleList, recoRow } from "./views/social.js";
import * as social from "./social.js";
import { toast } from "./toast.js";
import { go } from "./router.js";
import { t, count } from "./i18n.js";

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
    case "fork-open":
      state.forkOpen = b.dataset.post;
      render();
      document.querySelector("form[data-fork-form] input")?.focus();
      return true;
    case "fork-close":
      state.forkOpen = false;
      render();
      return true;
    case "close-publish":
      state.publishOpen = false;
      render();
      return true;
    case "follow":
      if (!state.profile) {
        toast(t("toast.profileToFollow"));
        go("profil");
        return true;
      }
      attempt(async () => {
        const status = await social.follow({ uid: b.dataset.uid, visibility: b.dataset.visibility });
        toast(status === "accepted" ? t("toast.followed") : t("toast.followRequested"));
      }, t("err.follow"));
      return true;
    case "unfollow":
      attempt(() => social.unfollow(b.dataset.uid), t("err.unfollow"));
      return true;
    case "accept-follower":
      attempt(() => social.acceptFollower(b.dataset.uid), t("err.accept"));
      return true;
    case "remove-follower":
      attempt(() => social.removeFollower(b.dataset.uid), t("err.removePerson"));
      return true;
    case "delete-post":
      state.confirm = "post:" + b.dataset.post;
      render();
      return true;
    case "delete-post-yes":
      state.confirm = null;
      attempt(async () => {
        await social.deletePost(b.dataset.post);
        toast(t("toast.postDeleted"));
        go("mes-publications");
      }, t("err.deletePost"));
      return true;
    // Mes publications, mode sélection : suppression des publications cochées
    case "select-delete-posts-yes": {
      const ids = [...state.selected];
      state.confirm = null;
      Promise.allSettled(ids.map((id) => social.deletePost(id))).then((res) => {
        const failed = res.filter((r) => r.status === "rejected").length;
        const done = ids.length - failed;
        state.selecting = false;
        state.selected = new Set();
        social.resetSocial(); // la liste est relue, sans les publications supprimées
        render();
        toast(failed
          ? `${done ? `${count(done, "toast.postsDeletedShort")}. ` : ""}${count(failed, "err.deletePosts")}`
          : count(ids.length, "toast.postsDeleted"));
      });
      return true;
    }
    case "add-reco-row": {
      const box = b.closest("form").querySelector("[data-recos]");
      const trip = currentTrip();
      if (!box || !trip) return true;
      box.insertAdjacentHTML("beforeend", recoRow(trip));
      box.lastElementChild.querySelector('[name="recoName"]').focus();
      return true;
    }
    case "rm-reco-row":
      b.closest("[data-reco-row]").remove();
      return true;
    case "like-comment": {
      const btn = b;
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.disabled = true;
      attempt(() => social.likeComment(btn.dataset.post, btn.dataset.comment, on),
        t("err.like"));
      return true;
    }
    case "reply-comment":
      state.replyTo = b.dataset.comment;
      render();
      document.querySelector("form[data-reply-to] textarea")?.focus();
      return true;
    case "reply-cancel":
      state.replyTo = null;
      render();
      return true;
    case "delete-comment":
      state.confirm = "comment:" + b.dataset.comment;
      render();
      return true;
    case "delete-comment-yes":
      state.confirm = null;
      attempt(async () => {
        await social.deleteComment(b.dataset.post, b.dataset.comment);
        toast(t("toast.commentDeleted"));
      }, t("err.deleteComment"));
      return true;
    case "fav-post": {
      const on = toggleFavoritePost(b.dataset.post);
      toast(on ? t("toast.postFavAdded") : t("toast.postFavRemoved"));
      // L'auteur est prévenu (si j'ai un profil) ; un échec n'empêche pas le favori
      (on ? social.likePost(b.dataset.post) : social.unlikePost(b.dataset.post)).catch(() => {});
      render();
      return true;
    }
    case "forget-missing-posts":
      forgetFavoritePosts(b.dataset.posts.split(","));
      toast(t("toast.missingRemoved"));
      render();
      return true;
    case "copy-link":
      navigator.clipboard.writeText(location.href).then(
        () => toast(t("toast.linkCopied")),
        () => toast(t("toast.copyAddress"))
      );
      return true;
  }
  return false;
}

// Voyage créé à partir d'un itinéraire publié. La publication est relue juste avant :
// supprimée ou devenue invisible entre-temps, aucun voyage n'est créé.
let forking = false; // un double clic ne crée qu'un voyage
async function forkPost(f) {
  if (forking) return;
  forking = true;
  f.querySelector("button[type=submit]").disabled = true;
  try {
    let post = null;
    try { post = await social.getPost(f.dataset.forkForm); } catch {}
    if (!post || !(post.trip && (post.trip.items || []).some((i) => i.type === "stop"))) {
      state.forkOpen = false;
      render();
      return toast(t("err.postGone"));
    }
    const trip = tripFromPost(post, { name: f.elements.name.value.trim(), start: f.elements.start.value }, social.RECO_KINDS);
    const c = countryByCode(trip.country);
    const id = createTrip({ ...trip, currency: (c && c.currency) || prefs.currency || "EUR" });
    toast(t("toast.forked", { handle: post.ownerHandle }));
    go("voyage-" + id);
  } finally {
    forking = false;
  }
}

export function onSocialSubmit(e) {
  const f = e.target;
  if (f.matches("[data-fork-form]")) {
    e.preventDefault();
    forkPost(f);
    return true;
  }
  if (f.matches("[data-publish-form]")) {
    e.preventDefault();
    const trip = currentTrip();
    const title = f.elements.title.value.trim();
    if (!trip || !title) return true;
    // Recommandations remplies (les lignes sans nom sont ignorées)
    const recos = [...f.querySelectorAll("[data-reco-row]")].map((r) => ({
      kind: r.querySelector('[name="recoKind"]').value,
      name: r.querySelector('[name="recoName"]').value,
      where: r.querySelector('[name="recoWhere"]').value,
      note: r.querySelector('[name="recoNote"]').value,
      url: r.querySelector('[name="recoUrl"]').value,
      stop: r.querySelector('[name="recoStop"]').value === "" ? null : +r.querySelector('[name="recoStop"]').value,
    }));
    attempt(async () => {
      await social.publish(trip, { title, visibility: f.elements.visibility.value, recos, budget: !!(f.elements.budget && f.elements.budget.checked) });
      state.publishOpen = false;
      toast(t("toast.published"));
      go("mes-publications");
    }, t("err.publish"));
    return true;
  }
  if (f.matches("[data-comment-form]")) {
    e.preventDefault();
    const text = f.elements.text.value.trim();
    if (!text) return toast(t("toast.writeComment")), true;
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    // En cas d'échec, la page n'est pas réaffichée : le texte tapé reste dans le champ
    const reply = f.dataset.replyTo ? { id: f.dataset.replyTo, author: f.dataset.replyAuthor } : null;
    social.addComment(f.dataset.commentForm, text.slice(0, 1000), reply)
      .then(() => {
        if (reply) state.replyTo = null;
        toast(reply ? t("toast.replyPosted") : t("toast.commentPosted"));
        render();
      })
      .catch(() => {
        btn.disabled = false;
        toast(t("err.comment"));
      });
    return true;
  }
  if (f.matches("[data-profile-form]")) {
    e.preventDefault();
    const name = f.elements.name.value.trim();
    const handle = f.elements.handle.value.trim().toLowerCase().replace(/^@/, "");
    const bio = f.elements.bio.value.trim();
    if (!name) return toast(t("toast.needName")), true;
    if (!social.HANDLE_RE.test(handle)) return toast(t("toast.badHandle")), true;
    social.saveProfile({ name, handle, bio, visibility: f.elements.visibility.value })
      .then(() => toast(t("toast.profileSaved")))
      .catch((err) => toast(err.code === "handle-taken" ? t("err.handleTaken") : t("err.saveFailed")))
      .finally(render);
    return true;
  }
  return false;
}

export function onSocialChange(el) {
  if (el.dataset && el.dataset.postVisibility) {
    attempt(async () => {
      await social.setPostVisibility(el.dataset.postVisibility, el.value);
      toast(t("toast.visibleTo", { who: social.VISIBILITIES[el.value] }));
    }, t("err.visibility"));
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
      if (el.value === q) box.innerHTML = peopleList(list, t("discover.noOneFound"));
    } catch {
      box.innerHTML = `<p class="note">${t("err.search")}</p>`;
    }
  }, 300);
  return true;
}
