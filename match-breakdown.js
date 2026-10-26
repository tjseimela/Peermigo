/* Peermigo: two-pillar match explanation for Find Peers.
 * Uses PM.matchDetails and distinguishes academic relevance from study logistics.
 */
(() => {
  'use strict';
  const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = value => Math.max(0, Math.min(100, value));
  const labels = {
    modules: 'Shared / related subjects and modules', course: 'Course similarity',
    institution: 'Same institution', campus: 'Campus compatibility',
    format: 'Preferred study format', availability: 'Compatible availability'
  };
  let overlay = null;
  let previousFocus = null;
  let originalOverflow = '';
  const id = 'pm-match-breakdown-title';
  const describeModule = m => {
    switch(m.kind){
      case 'exact': return 'Same or equivalent name · full name credit';
      case 'missing-level': return 'Level / part not fully specified · partial credit';
      case 'different-part': return 'Different parts at the same level · low partial credit';
      default: return 'Similar title, not confirmed identical · partial credit';
    }
  };
  const display = value => Number(value).toLocaleString('en-ZA', { maximumFractionDigits: 1 });
  const relevant = (detail, profile, mine, key) => {
    switch (key) {
      case 'modules': {
        const matches=detail.moduleMatches || [];
        if (detail.subjectEvidence === 'unknown') return 'At least one student has not listed subjects/modules yet. Academic overlap is unknown, not necessarily absent.';
        if (!matches.length) return 'No shared or closely related subjects were identified from the names both students provided.';
        const exact=matches.filter(m=>m.kind==='exact'&&m.similarity===1).length;
        const partial=matches.length-exact;
        return `${exact} exact/equivalent and ${partial} partial subject name match${matches.length===1?'':'es'}. Points reflect how many modules both students listed and how closely their names match.`;
      }
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
    const factorRow = key => {
      const max = weights[key], points = Math.min(max,Math.max(0,detail.parts[key] || 0));
      const percent = clamp(Math.round(points / max * 100));
      const pairs=key==='modules' && detail.moduleMatches?.length
        ? `<div class="pm-module-comparisons" aria-label="Matching subject names">${detail.moduleMatches.slice(0,4).map(m=>{
            const left=PM.formatStudyText?.(m.topic) || m.topic;
            const right=PM.formatStudyText?.(m.peerTopic) || m.peerTopic;
            const both=String(left).toLocaleLowerCase()===String(right).toLocaleLowerCase();
            return `<div class="pm-module-pair"><div class="pm-module-names"><span>${html(left)}</span>${both?'':`<span class="pm-module-arrow" aria-hidden="true">↔</span><span>${html(right)}</span>`}</div><span class="pm-module-kind ${m.kind==='exact'?'is-exact':'is-partial'}">${html(describeModule(m))}</span></div>`;
          }).join('')}${detail.moduleMatches.length>4?`<small>+ ${detail.moduleMatches.length-4} more compared</small>`:''}</div>` : '';
      return `<div class="pm-match-factor">
        <div class="pm-match-factor-head"><strong>${html(labels[key])}</strong><span>${html(display(points))} <small>/ ${html(display(max))} pts</small></span></div>
        <div class="pm-match-meter" role="progressbar" aria-label="${html(labels[key])}: ${html(display(points))} of ${html(display(max))} points" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${points}"><span style="width:${percent}%"></span></div>
        <p>${html(relevant(detail, profile, mine, key))}</p>
        ${pairs}
      </div>`;
    };
    const academicRows = ['modules','course'].map(factorRow).join('');
    const studyRows = ['institution','campus','format','availability'].filter(key => weights[key] > 0).map(factorRow).join('');
    const total = Math.round(Object.values(detail.parts).reduce((sum,v) => sum + (Number(v) || 0),0));
    const capped = detail.score < total;
    const caveat = capped
      ? `<div class="pm-match-cap" role="note"><strong>Why the total is limited</strong><p>${html(detail.reason)}. The overall score has a safeguard for missing academic relevance, different grade levels, or incompatible in-person locations. The category scores show the underlying evidence before this limit.</p></div>` : '';
    const modeLabel = detail.studyContext === 'campus' ? 'On-campus study' : detail.studyContext === 'hybrid' ? 'Hybrid study' : 'Online study';
    const root = document.createElement('div');
    root.className='pm-match-overlay';
    root.innerHTML=`<section class="pm-match-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}" aria-describedby="pm-match-subtitle">
      <div class="pm-match-dialog-head"><span class="pm-match-eyebrow">PEERMIGO · MATCH INSIGHTS</span><button class="pm-match-close" type="button" aria-label="Close match breakdown">×</button></div>
      <h2 id="${id}">Why you match</h2>
      <p id="pm-match-subtitle" class="pm-match-subtitle">Your study compatibility with <strong>${html(name)}</strong>.</p>
      <div class="pm-match-summary"><div><small>OVERALL MATCH</small><strong>${detail.score}%</strong><span>${html(modeLabel)}</span></div><div class="pm-match-summary-copy">Your overall score combines <strong>70% academic match</strong> and <strong>30% study compatibility</strong>. Review each category below to understand your score.</div></div>
      <div class="pm-match-pillars" aria-label="Two categories of your match score">
        <div class="pm-match-pillar pm-match-pillar-academic">
          <div class="pm-match-pillar-top"><span>ACADEMIC MATCH</span><span>70% of overall</span></div>
          <strong>${detail.academicScore}%</strong>
          <div class="pm-match-meter" role="progressbar" aria-label="Academic match ${detail.academicScore}%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${detail.academicScore}"><span style="width:${clamp(detail.academicScore)}%"></span></div>
          <small>Subjects / modules and course</small>
        </div>
        <div class="pm-match-pillar pm-match-pillar-study">
          <div class="pm-match-pillar-top"><span>STUDY COMPATIBILITY</span><span>30% of overall</span></div>
          <strong>${detail.studyScore}%</strong>
          <div class="pm-match-meter" role="progressbar" aria-label="Study compatibility ${detail.studyScore}%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${detail.studyScore}"><span style="width:${clamp(detail.studyScore)}%"></span></div>
          <small>Institution, location and preferences</small>
        </div>
      </div>
      <div class="pm-match-section-heading"><h3>Academic Match</h3><span>70 points maximum</span></div>
      <div class="pm-match-factors">${academicRows}</div>
      <div class="pm-match-section-heading"><h3>Study Compatibility</h3><span>30 points maximum</span></div>
      <div class="pm-match-factors">${studyRows}</div>
      ${caveat}
      <p class="pm-match-disclaimer">Percentages reflect reported profile similarities, not probabilities or guarantees. Academic Match is based 80% on subjects/modules and 20% on course; its category contributes 70% overall. Study Compatibility contributes 30% overall. Missing subjects are unknown, not confirmed mismatches. Availability contributes at most 4 overall points.</p>
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
