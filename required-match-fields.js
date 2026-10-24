/* Peermigo: shared registration and Edit Profile matching essentials validation.
   Legacy incomplete profiles are handled by the Edit Profile form, not silently overwritten. */
(function (root) {
  'use strict';
  const PM = root.PM = root.PM || {};
  const clean = value => String(value == null ? '' : value).trim();
  PM.matchEssentialsValidation = function (details) {
    const kind = clean(details.institution_type);
    const institution = clean(details.institution);
    const course = clean(details.course);
    const studyMethod = clean(details.study_method);
    const campus = clean(details.campus);
    const modules = Array.isArray(details.modules) ? details.modules.map(clean).filter(Boolean) : [];
    if (!['school', 'university', 'college'].includes(kind))
      return { field: 'institution_type', message: 'Institution type cannot be left blank.' };
    if (institution.length < 2 || institution.length > 120)
      return { field: 'institution', message: 'Institution name cannot be left blank. Enter at least 2 characters.' };
    if (course.length < 2 || course.length > 100)
      return { field: 'course', message: (kind === 'school' ? 'School grade' : 'Course or programme') + ' cannot be left blank.' };
    if (!['campus', 'virtual', 'hybrid'].includes(studyMethod))
      return { field: 'study_method', message: 'Preferred study format cannot be left blank.' };
    if (studyMethod === 'campus' && kind !== 'school' && campus.length < 2)
      return { field: 'campus', message: 'Campus cannot be left blank when you choose On campus.' };
    if (modules.length < 1)
      return { field: 'modules', message: 'Add at least one subject or module. You cannot leave it blank.' };
    if (modules.length > 10 || modules.some(item => item.length < 2 || item.length > 100))
      return { field: 'modules', message: 'Enter 1–10 valid subjects or modules, separated by commas (at least 2 characters each).' };
    return null;
  };
})(window);
