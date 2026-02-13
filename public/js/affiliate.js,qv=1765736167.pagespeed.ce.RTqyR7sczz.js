document.addEventListener('DOMContentLoaded', (e) => {
  console.log('do affilate job');
  doAffilateJob();
  doViralRefJob();
});

function doAffilateJob() {
  //Affilate code
  var aff_id = localStorage.getItem('aff_id');
  //console.log("Local aff_id: " + aff_id);

  //parse param from URL
  var aff_id_url = document.URL.replace(/.*aff_id=([^&]*).*|(.*)/, '$1');
  //console.log("URL aff_id: " + aff_id_url);

  if (aff_id_url && aff_id === null) {
    aff_id = aff_id_url;
    localStorage.setItem('aff_id', aff_id);
    console.log('Set affilate id');
  }

  if (aff_id) {
    //Add aff_id to Telegram Bot links
    var links = document.getElementsByTagName('a');
    var isChanged = false;
    for (var i = 0, max = links.length; i < max; i++) {
      if (links[i].href.indexOf('t.me/KirPolzaBot?start=') !== -1) {
        if (links[i].href.indexOf('--aff---') === -1) {
          links[i].href = links[i].href + '--aff---' + aff_id;
          isChanged = true;
        }
      }
    }

    if (isChanged) console.log('aff links changed');
  }
}

/**
 * Viral Referral Job
 * Parses vref=A1B2C3 from URL, saves to localStorage/cookie,
 * and appends --vref-XXXXXX to Telegram bot links
 */
function doViralRefJob() {
  // Get from localStorage
  var viral_ref = localStorage.getItem('viral_ref');

  // Parse vref param from URL
  var urlParams = new URLSearchParams(window.location.search);
  var viral_ref_url = urlParams.get('vref');

  // Validate format: exactly 6 chars, letter-digit-letter-digit-letter-digit
  var isValidFormat =
    viral_ref_url && /^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$/i.test(viral_ref_url);

  // Save to localStorage if valid
  if (isValidFormat) {
    viral_ref = viral_ref_url.toUpperCase();
    localStorage.setItem('viral_ref', viral_ref);

    // Also save to cookie (30 days) for cross-subdomain
    var expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie =
      'viral_ref=' +
      viral_ref +
      '; expires=' +
      expires +
      '; path=/; domain=.polza.com; SameSite=Lax';

    console.log('Set viral ref: ' + viral_ref);
  }

  // Add vref to Telegram Bot links
  if (viral_ref) {
    var links = document.getElementsByTagName('a');
    var isChanged = false;

    for (var i = 0, max = links.length; i < max; i++) {
      var href = links[i].href;

      if (
        href.indexOf('t.me/KirPolzaBot?start=') !== -1 &&
        href.indexOf('--vref-') === -1
      ) {
        links[i].href = href + '--vref-' + viral_ref;
        isChanged = true;
      }
    }

    if (isChanged) console.log('vref links changed');
  }
}
