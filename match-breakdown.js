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
      case 'exact': return m.similarity===1 ? 'Same or equivalent module name · full contextual credit' : 'Same or equivalent module name · partial contextual credit';
      case 'missing-level': return 'Level / part not fully specified · partial credit';
      case 'different-part': return 'Different parts at the same level · low partial credit';
      default: return 'Similar title, not confirmed identical · partial credit';
    }
  };
  const contextDescription=m=>{
    switch(m.contextKind){
      case 'shared-code': return 'Same institution and matching self-reported module codes · strong supporting evidence';
      case 'different-code': return 'Different module codes at the same institution · reduced credit';
      case 'different-course': return 'Different courses · similar module name, but content may differ · partial credit';
      case 'related-course': return 'Related courses · slightly reduced credit';
      case 'different-institution': return 'Different institutions · content may differ despite a matching course';
      case 'course-unknown': return 'Course details missing · module name matches, content not verified';
      case 'different-code-cross-institution': return 'Module codes differ across institutions · contents not verified';
      case 'shared-code-cross-institution': return 'Same self-reported code at different institutions · contents not verified';
      default: return 'Matching course context · module name comparison';
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
        return `${exact} exact/equivalent and ${partial} partial subject name match${matches.length===1?'':'es'}. Points consider module names, course context, institutions and optional self-reported codes. Matching names do not guarantee identical content.`;
      }
      case 'course': if (!detail.known?.course) return 'One or both students have not listed a course or grade yet.'; return detail.parts.course > 0
        ? `Your courses or grades are ${detail.parts.course >= (window.PM.MatchingV3.weights[detail.studyContext].course - .001) ? 'the same' : 'closely related'}.`
        : 'Different courses or insufficient information to compare them.';
      case 'institution': if (!detail.known?.institution) return 'One or both students have not listed an institution yet.'; return detail.parts.institution > 0 ? 'Both profiles list the same institution.' : 'No confirmed shared institution.';
      case 'campus': if (!detail.known?.campus) return 'Campus compatibility is unknown because a campus or institution is missing.'; return detail.studyContext === 'campus'
        ? (detail.locationVerified ? 'Location is verified for in-person study.' : 'An exact institution and campus match is needed for in-person study.')
        : (detail.parts.campus > 0 ? 'Same confirmed campus.' : 'Campus matching is not required for this study format.');
      case 'format': if (!detail.known?.format) return 'One or both students have not selected a preferred study format.'; return detail.parts.format > 0 ? 'Your preferred study formats can work together.' : 'Study formats do not match or are not both set.';
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
    if (!detail?.parts || !weights || !detail.categoryCoverage) return;
    close();
    previousFocus = document.activeElement;
    originalOverflow = document.body.style.overflow;
    const name = PM.formatPersonName?.(profile.full_name) || profile.full_name || 'this student';
    const factorRow = key => {
      const max = weights[key], points = Math.min(max,Math.max(0,detail.parts[key] || 0));
      const isKnown=Boolean(detail.known?.[key]);
      const percent = isKnown ? clamp(Math.round(points / max * 100)) : 0;
      const stateLabel=isKnown?`${html(display(points))} <small>/ ${html(display(max))} pts</small>`:'<em>Unknown</em>';
      const meterLabel=isKnown?`${html(labels[key])}: ${html(display(points))} of ${html(display(max))} points`:`${html(labels[key])}: not enough information to compare`;
      const pairs=key==='modules' && detail.moduleMatches?.length
        ? `<div class="pm-module-comparisons" aria-label="Matching subject names">${detail.moduleMatches.slice(0,4).map(m=>{
            const left=PM.formatStudyText?.(m.topic) || m.topic;
            const right=PM.formatStudyText?.(m.peerTopic) || m.peerTopic;
            const both=String(left).toLocaleLowerCase()===String(right).toLocaleLowerCase();
            return `<div class="pm-module-pair"><div class="pm-module-names"><span>${html(left)}</span>${both?'':`<span class="pm-module-arrow" aria-hidden="true">↔</span><span>${html(right)}</span>`}</div><span class="pm-module-kind ${m.kind==='exact'&&m.similarity===1?'is-exact':'is-partial'}">${html(describeModule(m))}</span><small class="pm-module-context">${html(contextDescription(m))}${m.codeA&&m.codeB?` · Codes: ${html(m.codeA)} / ${html(m.codeB)}`:''}</small></div>`;
          }).join('')}${detail.moduleMatches.length>4?`<small>+ ${detail.moduleMatches.length-4} more compared</small>`:''}</div>` : '';
      return `<div class="pm-match-factor ${isKnown?'':'pm-match-factor-unknown'}">
        <div class="pm-match-factor-head"><strong>${html(labels[key])}</strong><span>${stateLabel}</span></div>
        <div class="pm-match-meter" role="${isKnown?'progressbar':'img'}" aria-label="${meterLabel}" ${isKnown?`aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${points}"`:''}><span style="width:${percent}%"></span></div>
        <p>${html(relevant(detail, profile, mine, key))}</p>
        ${pairs}
      </div>`;
    };
    const academicRows = ['modules','course'].map(factorRow).join('');
    const studyRows = ['institution','campus','format','availability'].filter(key => weights[key] > 0).map(factorRow).join('');
    const caveat = detail.scoreCapped
      ? `<div class="pm-match-cap" role="note"><strong>Why the total is limited</strong><p>${html(detail.reason)}. A safeguard limits otherwise high results for unrelated studies, different school grades or unverified on-campus locations.</p></div>` : '';
    const coverageNote = detail.insufficientData
      ? `<div class="pm-match-coverage-warning" role="status"><strong>Not enough data for an overall match</strong><p>Each category needs at least 60% of its weighted details available for comparison. Missing information is marked unknown and does not earn zero compatibility points. Encourage students to complete their study details.</p></div>`
      : `<p class="pm-match-coverage-hint">${detail.overallCoverage}% of the weighted profile information could be compared. Missing details are excluded from the category calculations.</p>`;
    const pillar = (label,key,description) => {
      const num=key==='academic'?detail.academicScore:detail.studyScore;
      const coverage=detail.categoryCoverage[key];
      const ready=num!==null && num!==undefined;
      return `<div class="pm-match-pillar pm-match-pillar-${key}">
        <div class="pm-match-pillar-top"><span>${label}</span><span>${key==='academic'?'70':'30'}% of overall</span></div>
        <strong class="${ready?'':'pm-match-pillar-unavailable'}">${ready?`${num}%`:'Not enough data'}</strong>
        <div class="pm-match-meter" role="${ready?'progressbar':'img'}" aria-label="${ready?`${html(label)} ${num}%`:`${html(label)}: not enough data`}" ${ready?`aria-valuemin="0" aria-valuemax="100" aria-valuenow="${num}"`:''}><span style="width:${ready?clamp(num):0}%"></span></div>
        <div class="pm-coverage-line"><span>Data coverage</span><b>${coverage}%</b></div>
        <div class="pm-coverage-meter" role="progressbar" aria-label="${html(label)} data coverage ${coverage}%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${coverage}"><span style="width:${coverage}%"></span></div>
        <small>${html(description)}</small>
      </div>`;
    };
    const modeLabel = detail.studyContext === 'campus' ? 'On-campus study' : detail.studyContext === 'hybrid' ? 'Hybrid study' : 'Online study';
    const root = document.createElement('div');
    root.className='pm-match-overlay';
    root.innerHTML=`<section class="pm-match-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}" aria-describedby="pm-match-subtitle">
      <div class="pm-match-dialog-head"><span class="pm-match-eyebrow">PEERMIGO · MATCH INSIGHTS</span><button class="pm-match-close" type="button" aria-label="Close match breakdown">×</button></div>
      <h2 id="${id}">Why you match</h2>
      <p id="pm-match-subtitle" class="pm-match-subtitle">Your study compatibility with <strong>${html(name)}</strong>.</p>
      <div class="pm-match-summary"><div><small>OVERALL MATCH</small><strong class="${detail.showScore?'':'pm-match-overall-unavailable'}">${detail.showScore?`${detail.score}%`:'Not enough data'}</strong><span>${html(modeLabel)}</span></div><div class="pm-match-summary-copy">Your overall score combines <strong>70% academic match</strong> and <strong>30% study compatibility</strong>. At least 60% data coverage is needed in each category.</div></div>
      ${coverageNote}
      <div class="pm-match-pillars" aria-label="Two categories of your match score">
        ${pillar('ACADEMIC MATCH','academic','Subjects / modules and course')}
        ${pillar('STUDY COMPATIBILITY','study','Institution, location and preferences')}
      </div>
      <div class="pm-match-section-heading"><h3>Academic Match</h3><span>70 points maximum</span></div>
      <div class="pm-match-factors">${academicRows}</div>
      <div class="pm-match-section-heading"><h3>Study Compatibility</h3><span>30 points maximum</span></div>
      <div class="pm-match-factors">${studyRows}</div>
      ${caveat}
      <p class="pm-match-disclaimer">Module codes and subject names are self-reported, not verified curriculum equivalence. These are compatibility estimates, not probabilities. Each category only calculates a percentage if at least 60% of its weighted factors have data from both students. Unknown factors are excluded from the category denominator; known differences can still score zero. The overall score uses 70% academic and 30% study compatibility. Data coverage describes completeness, not compatibility or certainty.</p>
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
