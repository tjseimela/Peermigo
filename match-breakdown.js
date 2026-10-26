/* Peermigo: transparent score explanation for the Find Peers cards.
 * Uses PM.matchDetails and the existing v3 weights, without changing ranking.
 */
(() => {
  'use strict';
  const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = value => Math.max(0, Math.min(100, value));
  const labels = {
    modules: 'Shared subjects / modules', course: 'Course similarity',
    institution: 'Same institution', campus: 'Campus compatibility',
    format: 'Preferred study format', availability: 'Compatible availability'
  };
  let overlay = null;
  let previousFocus = null;
  let originalOverflow = '';
  const id = 'pm-match-breakdown-title';
  const display = value => Number(value).toLocaleString('en-ZA', { maximumFractionDigits: 1 });
  const relevant = (detail, profile, mine, key) => {
    switch (key) {
      case 'modules': return detail.sharedModules?.length
        ? `${detail.sharedModules.length} shared subject${detail.sharedModules.length === 1 ? '' : 's'}: ${detail.sharedModules.slice(0,3).map(topic => window.PM.formatStudyText?.(topic) || topic).join(', ')}${detail.sharedModules.length > 3 ? ' and more' : ''}.`
        : 'No confidently matching subjects or modules were identified.';
      case 'course': return detail.parts.course > 0
        ? `Your courses or grades are ${detail.parts.course >= (window.PM.MatchingV3.weights[detail.studyContext].course - .001) ? 'the same' : 'closely related'}.`
        : 'Different courses or insufficient information to compare them.';
      case 'institution': return detail.parts.institution > 0 ? 'Both profiles list the same institution.' : 'No confirmed shared institution.';
      case 'campus': return detail.studyContext === 'campus'
        ? (detail.locationVerified ? 'Location is verified for in-person study.' : 'An exact institution and campus match is needed for in-person study.')
        : (detail.parts.campus > 0 ? 'Same confirmed campus.' : 'Campus matching is not required for this study format.');
      case 'format': return detail.parts.format > 0 ? 'Your preferred study formats can work together.' : 'Study formats do not match or are not both set.';
      case 'availability': return (mine?.availability && profile?.availability)
        ? (mine.availability === profile.availability ? 'Both students prefer the same study time.' : 'Preferred times are considered, with flexibility allowed.')
        : 'One or both students have not provided availability.';
      default: return '';
    }
  };
  function close() {
    if (!overlay) return;
    const open = overlay;
    overlay = null;
    open.remove();
    document.body.style.overflow = originalOverflow;
    document.removeEventListener('keydown', onKeyDown, true);
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function onKeyDown(event) {
    if (!overlay) return;
    if (event.key === 'Escape') {event.preventDefault(); close(); return;}
    if (event.key !== 'Tab') return;
    const controls = [...overlay.querySelectorAll('button:not([disabled]),a[href],input,textarea,select')].filter(n => n.getClientRects().length);
    if (!controls.length) return;
    const first=controls[0],last=controls[controls.length-1];
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
  }
  function open(profile, mine) {
    const PM = window.PM;
    const detail = PM?.matchDetails?.(profile, mine);
    const weights = PM?.MatchingV3?.weights?.[detail?.studyContext];
    if (!detail?.showScore || !detail.parts || !weights) return;
    close();
    previousFocus = document.activeElement;
    originalOverflow = document.body.style.overflow;
    const name = PM.formatPersonName?.(profile.full_name) || profile.full_name || 'this student';
    const factorRows = Object.keys(labels).filter(key => weights[key] > 0).map(key => {
      const max = weights[key], points = Math.min(max,Math.max(0,detail.parts[key] || 0));
      const percent = clamp(Math.round(points / max * 100));
      return `<div class="pm-match-factor">
        <div class="pm-match-factor-head"><strong>${html(labels[key])}</strong><span>${html(display(points))} <small>/ ${html(display(max))} pts</small></span></div>
        <div class="pm-match-meter" role="progressbar" aria-label="${html(labels[key])}: ${html(display(points))} of ${html(display(max))} points" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${points}"><span style="width:${percent}%"></span></div>
        <p>${html(relevant(detail, profile, mine, key))}</p>
      </div>`;
    }).join('');
    const total = Math.round(Object.values(detail.parts).reduce((sum,v) => sum + (Number(v) || 0),0));
    const capped = detail.score < total;
    const caveat = capped
      ? `<div class="pm-match-cap" role="note"><strong>Why the total is limited</strong><p>${html(detail.reason)}. Peermigo limits the overall score when academic or in-person study requirements are not met, even if other factors score well.</p></div>` : '';
    const modeLabel = detail.studyContext === 'campus' ? 'On-campus study' : detail.studyContext === 'hybrid' ? 'Hybrid study' : 'Online study';
    const root = document.createElement('div');
    root.className='pm-match-overlay';
    root.innerHTML=`<section class="pm-match-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}" aria-describedby="pm-match-subtitle">
      <div class="pm-match-dialog-head"><span class="pm-match-eyebrow">PEERMIGO · MATCH INSIGHTS</span><button class="pm-match-close" type="button" aria-label="Close match breakdown">×</button></div>
      <h2 id="${id}">Why you match</h2>
      <p id="pm-match-subtitle" class="pm-match-subtitle">Your study compatibility with <strong>${html(name)}</strong>.</p>
      <div class="pm-match-summary"><div><small>YOUR MATCH SCORE</small><strong>${detail.score}%</strong><span>${html(modeLabel)}</span></div><div class="pm-match-summary-copy">Calculated from both student profiles. See how each factor is weighted in your score.</div></div>
      <div class="pm-match-factors">${factorRows}</div>
      ${caveat}
      <p class="pm-match-disclaimer">Scores are estimates of academic fit and study logistics, not probabilities or guarantees. Shared subjects and courses carry most of the weight. Availability contributes at most 4 points.</p>
      <div class="pm-match-footer"><button class="pm-match-done" type="button">Got it</button></div>
    </section>`;
    root.addEventListener('click', e => { if(e.target === root || e.target.closest('.pm-match-close,.pm-match-done')) close(); });
    document.body.appendChild(root);
    overlay = root;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown',onKeyDown,true);
    root.querySelector('.pm-match-close').focus({ preventScroll: true });
  }
  window.PMMatchBreakdown = { open, close };
})();
