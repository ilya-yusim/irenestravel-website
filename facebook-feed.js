/* Irene's Travel Facebook feed renderer.
   Fetches data/facebook-posts.json, written by the scheduled GitHub Action.
   Contains NO access token and makes NO call to Facebook. If the JSON cannot
   be loaded, the section falls back to the Facebook link only. */
(function () {
  var container = document.getElementById('facebook-feed');
  if (!container) return;

  var MAX_POSTS = 6;

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        month: 'long', day: 'numeric', year: 'numeric'
      });
    } catch (e) { return ''; }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function excerpt(message) {
    var text = String(message || '').trim();
    if (text.length > 220) text = text.slice(0, 220).trim() + '…';
    return text;
  }

  fetch('data/facebook-posts.json', { cache: 'no-store' })
    .then(function (res) { if (!res.ok) throw new Error('feed unavailable'); return res.json(); })
    .then(function (data) {
      var posts = (data && data.posts ? data.posts : []).slice(0, MAX_POSTS);
      if (!posts.length) throw new Error('no posts');

      var html = posts.map(function (post) {
        var image = post.full_picture
          ? '<a href="' + escapeHtml(post.permalink_url) + '" target="_blank" rel="noopener">' +
            '<img src="' + escapeHtml(post.full_picture) + '" alt="" loading="lazy"></a>'
          : '';
        var badge = post.type === 'video' ? '<span class="fb-badge">Video</span>' : '';
        return '<article class="fb-card">' + image +
          '<div class="fb-card-body">' +
          '<p class="fb-date">' + escapeHtml(formatDate(post.created_time)) + ' ' + badge + '</p>' +
          '<p class="fb-text">' + escapeHtml(excerpt(post.message)) + '</p>' +
          '<p><a class="fb-link" href="' + escapeHtml(post.permalink_url) + '" target="_blank" rel="noopener">View on Facebook →</a></p>' +
          '</div></article>';
      }).join('');

      container.innerHTML = '<div class="fb-grid">' + html + '</div>' +
        '<p class="fb-follow"><a href="https://www.facebook.com/irenestravel" target="_blank" rel="noopener">Follow Irene\u2019s Travel on Facebook</a></p>';
    })
    .catch(function () {
      /* Fallback: no broken box, just the link. */
      container.innerHTML =
        '<p class="fb-follow"><a href="https://www.facebook.com/irenestravel" target="_blank" rel="noopener">Follow Irene\u2019s Travel on Facebook</a></p>';
    });
})();
