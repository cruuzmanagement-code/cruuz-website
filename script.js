const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");
const reviewForm = document.querySelector("[data-review-form]");
const reviewStatus = document.querySelector("[data-review-status]");
const reviewsList = document.querySelector("[data-reviews-list]");
const refreshReviews = document.querySelector("[data-refresh-reviews]");

const supabaseConfig = window.CRUUZ_SUPABASE_CONFIG || {};

const normalizeSupabaseUrl = (value) => {
  const rawValue = String(value || "").trim().replace(/\/$/, "");
  if (!rawValue) return "";
  if (/^https?:\/\//i.test(rawValue)) return rawValue;
  if (/^[a-z0-9-]+$/i.test(rawValue)) return `https://${rawValue}.supabase.co`;
  return rawValue;
};

const supabaseUrl = normalizeSupabaseUrl(supabaseConfig.url);
const supabaseAnonKey = String(supabaseConfig.anonKey || "").trim();
const isPlaceholderValue = (value) => /^PASTE_|_HERE$/i.test(String(value || ""));
const hasSupabaseConfig = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !isPlaceholderValue(supabaseConfig.url) &&
    !isPlaceholderValue(supabaseConfig.anonKey),
);
const reviewsFallbackMessage = "Client reviews will be added here soon.";

const setReviewRefreshVisible = (isVisible) => {
  if (!refreshReviews) return;
  refreshReviews.hidden = !isVisible;
};

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

const setHeaderShadow = () => {
  if (!header) return;
  header.classList.toggle("has-shadow", window.scrollY > 8);
};

setHeaderShadow();
window.addEventListener("scroll", setHeaderShadow, { passive: true });

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -40px 0px" },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const supabaseHeaders = {
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  "Content-Type": "application/json",
};

const getReviewsEndpoint = () => {
  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    is_approved: "eq.true",
    select: "id,customer_name,business_name,review_text,rating,industry,display_order,created_at",
    order: "display_order.asc,created_at.desc",
  });

  return `${baseUrl}/rest/v1/reviews?${params.toString()}`;
};

const getSubmitEndpoint = () => `${supabaseUrl.replace(/\/$/, "")}/rest/v1/reviews`;

const setStatus = (message, type = "") => {
  if (!reviewStatus) return;
  reviewStatus.textContent = message;
  reviewStatus.classList.toggle("is-success", type === "success");
  reviewStatus.classList.toggle("is-error", type === "error");
};

const createStars = (rating) => {
  const safeRating = Math.max(1, Math.min(5, Number(rating) || 0));
  return "\u2605".repeat(safeRating) + "\u2606".repeat(5 - safeRating);
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderReviews = (reviews) => {
  if (!reviewsList) return;

  if (!reviews.length) {
    setReviewRefreshVisible(false);
    reviewsList.innerHTML = `<p class="reviews-empty">${reviewsFallbackMessage}</p>`;
    return;
  }

  setReviewRefreshVisible(true);
  reviewsList.innerHTML = reviews
    .map((review) => {
      const name = escapeHtml(review.customer_name || "Cruuz client");
      const business = review.business_name ? `, ${escapeHtml(review.business_name)}` : "";
      const industry = review.industry ? escapeHtml(review.industry) : "Client review";
      const text = escapeHtml(review.review_text);
      const stars = createStars(review.rating);
      const rating = Math.max(1, Math.min(5, Number(review.rating) || 0));

      return `
        <article class="review-card">
          <div class="stars" aria-label="${rating} out of 5 stars">${stars}</div>
          <blockquote>${text}</blockquote>
          <footer>
            <strong>${name}${business}</strong>
            <span>${industry}</span>
          </footer>
        </article>
      `;
    })
    .join("");
};

const loadReviews = async () => {
  if (!reviewsList) return;

  if (!hasSupabaseConfig) {
    setReviewRefreshVisible(false);
    reviewsList.innerHTML = `<p class="reviews-empty">${reviewsFallbackMessage}</p>`;
    return;
  }

  setReviewRefreshVisible(false);
  reviewsList.innerHTML = '<p class="reviews-empty reviews-loading">Loading approved reviews...</p>';

  try {
    const response = await fetch(getReviewsEndpoint(), {
      headers: supabaseHeaders,
    });

    if (!response.ok) {
      throw new Error("Unable to load reviews.");
    }

    const reviews = await response.json();
    renderReviews(Array.isArray(reviews) ? reviews : []);
  } catch (error) {
    setReviewRefreshVisible(false);
    reviewsList.innerHTML = `<p class="reviews-empty">${reviewsFallbackMessage}</p>`;
  }
};

const submitReview = async (event) => {
  event.preventDefault();

  if (!reviewForm) return;

  if (!hasSupabaseConfig) {
    setStatus(reviewsFallbackMessage);
    return;
  }

  const formData = new FormData(reviewForm);
  const payload = {
    customer_name: String(formData.get("name") || "").trim(),
    business_name: String(formData.get("business_name") || "").trim() || null,
    rating: Number(formData.get("rating")),
    industry: String(formData.get("service_type") || "").trim(),
    review_text: String(formData.get("review_text") || "").trim(),
    is_approved: false,
  };

  if (!payload.customer_name || !payload.rating || !payload.industry || !payload.review_text) {
    setStatus("Please complete your name, rating, service, and review before submitting.", "error");
    return;
  }

  setStatus("Submitting your review...");
  reviewForm.querySelector("button")?.setAttribute("disabled", "true");

  try {
    const response = await fetch(getSubmitEndpoint(), {
      method: "POST",
      headers: {
        ...supabaseHeaders,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Unable to submit review.");
    }

    reviewForm.reset();
    setStatus("Thank you. Your review was submitted and may appear after approval.", "success");
  } catch (error) {
    setStatus("Your review could not be submitted right now. Please try again.", "error");
  } finally {
    reviewForm.querySelector("button")?.removeAttribute("disabled");
  }
};

reviewForm?.addEventListener("submit", submitReview);
refreshReviews?.addEventListener("click", loadReviews);
loadReviews();
